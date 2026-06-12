"""Command line entry point for the MobileSec Observatory data pipeline."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict
from datetime import date, datetime, timezone
from pathlib import Path
import json
import logging
import os

import click

from pipeline.analyzers.apk_analyzer import APKAnalysisResult, APKAnalyzer
from pipeline.analyzers.batch_analyzer import BatchAPKAnalyzer
from pipeline.collectors.bulletin_scraper import BulletinScraper, Vulnerability, cache_path, progress_items as bulletin_progress_items, vulnerabilities_to_dicts
from pipeline.collectors.comparison_extractor import ComparisonExtractor, PermissionAPIMerger
from pipeline.collectors.fdroid_collector import FDroidCollector, fdroid_apps_to_dicts, progress_items as fdroid_progress_items, select_sample
from pipeline.exporters.json_exporter import JSONExporter
from pipeline.metrics.aggregator import StatisticsAggregator
from pipeline.metrics.clri_calculator import CLRICalculator
from pipeline.metrics.pdi_calculator import PDICalculator
from pipeline.quality.validators import DataQualityValidator

logger = logging.getLogger(__name__)

PIPELINE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_ROOT.parent
RAW_DIR = PIPELINE_ROOT / "raw"
PARSED_DIR = PIPELINE_ROOT / "parsed"
METRICS_OUTPUT_DIR = PIPELINE_ROOT / "metrics" / "output"
WEB_DATA_DIR = PROJECT_ROOT / "web" / "public" / "data"
FIXTURE_DIR = PIPELINE_ROOT / "tests" / "fixtures"

APP_META = {
    "org.mso.demo": {"name": "MSO Demo", "category_id": "Development", "category_zh": "开发工具", "summary": "Manifest fixture demo app."},
    "com.mso.media": {"name": "MSO Media", "category_id": "Multimedia", "category_zh": "媒体", "summary": "Media fixture app."},
    "io.mso.reader": {"name": "MSO Reader", "category_id": "Reading", "category_zh": "阅读", "summary": "Reader fixture app."},
}


@click.group()
@click.option("--offline", is_flag=True, help="跳过网络，仅使用缓存/fixtures")
@click.pass_context
def cli(ctx: click.Context, offline: bool) -> None:
    """MSO Data Pipeline."""
    ctx.ensure_object(dict)
    ctx.obj["offline"] = offline
    logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")


@cli.command()
@click.option("--offline", is_flag=True, help="跳过网络，仅使用缓存/fixtures")
@click.option("--limit", type=int, default=None, help="仅下载前 N 个 APK")
@click.pass_context
def collect_fdroid(ctx: click.Context, offline: bool, limit: int | None) -> None:
    """采集 F-Droid 应用。"""
    offline = _offline(ctx, offline)
    _set_offline_env(offline)
    apps = select_sample(PIPELINE_ROOT / "config" / "samples_selection.yaml")
    _write_json(
        RAW_DIR / "fdroid" / "selected_apps.json",
        {"generated_at": _now_iso(), "total_count": len(apps), "apps": fdroid_apps_to_dicts(apps)},
    )
    counts = Counter(app.category for app in apps)
    click.echo("[step] collect-fdroid: selected " + ", ".join(f"{k}={v}" for k, v in sorted(counts.items())))

    if offline:
        click.echo("[step] collect-fdroid: offline mode, APK downloads skipped")
        return

    collector = FDroidCollector(cache_dir=RAW_DIR / "fdroid")
    downloaded = 0
    for app in fdroid_progress_items(apps, "download-apks"):
        for version in app.versions:
            if limit is not None and downloaded >= limit:
                click.echo(f"[step] collect-fdroid: download limit reached ({limit})")
                return
            try:
                collector.download_apk(app, version)
                downloaded += 1
                click.echo(f"[step] collect-fdroid: downloaded {app.package_name} {version.version_name}")
            except Exception as exc:
                logger.error("Failed to download %s %s: %s", app.package_name, version.version_name, exc)
                continue


@cli.command()
@click.option("--offline", is_flag=True, help="跳过网络，仅使用缓存/fixtures")
@click.option("--start", default=None, help="开始月份 YYYY-MM")
@click.option("--end", default=None, help="结束月份 YYYY-MM")
@click.pass_context
def collect_bulletins(ctx: click.Context, offline: bool, start: str | None, end: str | None) -> None:
    """采集 Android Security Bulletin。"""
    offline = _offline(ctx, offline)
    start_date, end_date = _resolve_month_range(start, end)
    scraper = BulletinScraper()
    cache_dir = RAW_DIR / "bulletins" / "cache"
    parsed_dir = RAW_DIR / "bulletins" / "parsed"
    cache_dir.mkdir(parents=True, exist_ok=True)
    parsed_dir.mkdir(parents=True, exist_ok=True)

    bulletin_dates = scraper.list_bulletins_in_range(start_date, end_date)
    for bulletin_date in bulletin_progress_items(bulletin_dates, "collect-bulletins"):
        if offline:
            html = _load_offline_bulletin_html(bulletin_date, cache_dir)
        else:
            url = scraper.bulletin_url(bulletin_date)
            try:
                html = scraper._fetch(url)
                cache_path(cache_dir, bulletin_date).write_text(html, encoding="utf-8")
            except Exception as exc:
                logger.error("Failed to fetch bulletin %s: %s", bulletin_date.isoformat(), exc)
                continue

        vulnerabilities = scraper._parse(html, bulletin_date)
        _write_json(
            parsed_dir / f"{bulletin_date:%Y-%m}.json",
            {
                "generated_at": _now_iso(),
                "bulletin_date": bulletin_date.isoformat(),
                "count": len(vulnerabilities),
                "vulnerabilities": vulnerabilities_to_dicts(vulnerabilities),
            },
        )
        click.echo(f"[step] collect-bulletins: {bulletin_date:%Y-%m} parsed {len(vulnerabilities)} vulnerabilities")


@cli.command()
@click.option("--offline", is_flag=True, help="跳过网络，仅使用缓存/fixtures")
@click.option("--apk-dir", type=click.Path(path_type=Path), default=RAW_DIR / "apks")
@click.option("--output", type=click.Path(path_type=Path), default=PARSED_DIR / "apks")
@click.option("--fixtures", is_flag=True, help="使用 pipeline/tests/fixtures/manifests")
@click.pass_context
def analyze_apks(ctx: click.Context, offline: bool, apk_dir: Path, output: Path, fixtures: bool) -> None:
    """分析所有已下载的 APK 或 manifest fixtures。"""
    offline = _offline(ctx, offline)
    source_dir = FIXTURE_DIR / "manifests" if fixtures or offline else apk_dir
    metadata = _read_json(PIPELINE_ROOT / "data" / "permissions_metadata.json")
    analyzer = BatchAPKAnalyzer(APKAnalyzer(metadata))
    results = analyzer.analyze_dataset(source_dir, output, skip_existing=False)
    counts = Counter(result.package_name for result in results)
    click.echo("[step] analyze-apks: fixtures" if source_dir == FIXTURE_DIR / "manifests" else "[step] analyze-apks: apks")
    for package_name, count in sorted(counts.items()):
        click.echo(f"[step] analyze-apks: {package_name} versions={count}")


@cli.command()
@click.option("--offline", is_flag=True, help="跳过网络，仅使用缓存/fixtures")
@click.pass_context
def compute_metrics(ctx: click.Context, offline: bool) -> None:
    """计算 PDI / CLRI / 聚合统计。"""
    _offline(ctx, offline)
    analyses = _load_analyses(PARSED_DIR / "apks")
    if not analyses:
        metadata = _read_json(PIPELINE_ROOT / "data" / "permissions_metadata.json")
        analyses = BatchAPKAnalyzer(APKAnalyzer(metadata)).analyze_dataset(FIXTURE_DIR / "manifests", PARSED_DIR / "apks", skip_existing=False)
    metadata = _read_json(PIPELINE_ROOT / "data" / "permissions_metadata.json")
    vulnerabilities = _load_vulnerabilities(RAW_DIR / "bulletins" / "parsed")
    if not vulnerabilities:
        vulnerabilities = _default_fixture_vulnerabilities()

    apps_payload = _build_apps_payload(analyses)
    app_versions_payload = _build_app_versions_payload(analyses)
    permission_api_payload = _build_permission_api_payload()
    component_api_payload = _read_json(PIPELINE_ROOT / "data" / "component_api_map.json")

    pdi_payload, apps_with_drift = _build_pdi_payload(analyses, metadata)
    clri_payload, clri_results = _build_clri_payload(analyses, vulnerabilities, metadata, permission_api_payload, component_api_payload)
    vulnerabilities_payload = _build_vulnerabilities_payload(vulnerabilities)
    dashboard_payload = StatisticsAggregator().aggregate_dashboard_stats(
        apps_payload["apps"],
        analyses,
        vulnerabilities,
        clri_results,
        apps_with_drift_count=apps_with_drift,
    )
    _sync_dashboard_overview_counts(dashboard_payload, apps_payload, app_versions_payload, vulnerabilities_payload)
    comparison_payload = _build_comparison_payload()

    payloads = {
        "apps": apps_payload,
        "app_versions": app_versions_payload,
        "permissions_metadata": metadata,
        "pdi_results": pdi_payload,
        "vulnerabilities": vulnerabilities_payload,
        "clri_matrix": clri_payload,
        "comparison": comparison_payload,
        "dashboard_stats": dashboard_payload,
        "permission_api_map": permission_api_payload,
        "component_api_map": component_api_payload,
    }
    JSONExporter().export_all(METRICS_OUTPUT_DIR, payloads)
    click.echo(f"[step] compute-metrics: wrote 10 JSON payloads to {METRICS_OUTPUT_DIR}")


@cli.command()
@click.option("--offline", is_flag=True, help="跳过网络，仅使用缓存/fixtures")
@click.pass_context
def export_json(ctx: click.Context, offline: bool) -> None:
    """生成前端所需的所有 JSON。"""
    _offline(ctx, offline)
    if not (METRICS_OUTPUT_DIR / "dashboard_stats.json").exists():
        ctx.invoke(compute_metrics, offline=True)
    payloads = {
        path.stem: json.loads(path.read_text(encoding="utf-8"))
        for path in METRICS_OUTPUT_DIR.glob("*.json")
    }
    JSONExporter().export_all(WEB_DATA_DIR, payloads)
    report = DataQualityValidator().validate_all(WEB_DATA_DIR)
    click.echo(report.to_text())
    if not report.passed:
        raise click.ClickException("validation failed")
    click.echo("[step] export-json: exported 10 JSON files")


@cli.command()
@click.option("--offline", is_flag=True, help="跳过网络，仅使用缓存/fixtures")
@click.pass_context
def run_all(ctx: click.Context, offline: bool) -> None:
    """一键运行完整流水线。"""
    offline = _offline(ctx, offline)
    ctx.obj["offline"] = offline
    for name, command, kwargs in [
        ("collect-fdroid", collect_fdroid, {"offline": offline, "limit": None}),
        ("collect-bulletins", collect_bulletins, {"offline": offline, "start": None, "end": None}),
        ("analyze-apks", analyze_apks, {"offline": offline, "apk_dir": RAW_DIR / "apks", "output": PARSED_DIR / "apks", "fixtures": offline}),
        ("compute-metrics", compute_metrics, {"offline": offline}),
        ("export-json", export_json, {"offline": offline}),
    ]:
        try:
            ctx.invoke(command, **kwargs)
        except Exception:
            click.echo(f"[error] {name} failed")
            raise


def _build_apps_payload(analyses: list[APKAnalysisResult]) -> dict:
    """由分析结果构建 apps.json payload。"""
    grouped = _group_analyses(analyses)
    apps = []
    for package_name, versions in sorted(grouped.items()):
        meta = APP_META.get(package_name, {"name": package_name, "category_id": "Development", "category_zh": "开发工具", "summary": "Fixture app."})
        version_names = [item.version_name for item in sorted(versions, key=lambda item: item.version_code)]
        apps.append(
            {
                "id": package_name,
                "name": meta["name"],
                "name_zh": meta["name"],
                "category_id": meta["category_id"],
                "category_zh": meta["category_zh"],
                "summary": meta["summary"],
                "description": "Generated from manifest fixture analysis.",
                "fdroid_url": f"https://f-droid.org/packages/{package_name}/",
                "source_url": "https://example.org/mobile-sec-observatory",
                "license": "Mock",
                "versions": version_names,
                "latest_version": version_names[-1],
            }
        )
    return {
        "schema_version": "1.0",
        "generated_at": _now_iso(),
        "source": "F-Droid",
        "fdroid_index_date": date.today().isoformat(),
        "total_count": len(apps),
        "apps": apps,
    }


def _build_app_versions_payload(analyses: list[APKAnalysisResult]) -> dict:
    """由分析结果构建 app_versions.json payload。"""
    versions = []
    for analysis in sorted(analyses, key=lambda item: (item.package_name, item.version_code)):
        versions.append(
            {
                "app_id": analysis.package_name,
                "version_name": analysis.version_name,
                "version_code": analysis.version_code,
                "release_date": f"2026-0{min(analysis.version_code, 9)}-01",
                "apk_sha256": analysis.apk_sha256,
                "apk_size_kb": analysis.apk_size_kb,
                "target_sdk": analysis.target_sdk,
                "min_sdk": analysis.min_sdk,
                "permissions": {
                    "all": analysis.permissions_all,
                    "dangerous": analysis.permissions_dangerous,
                    "normal": analysis.permissions_normal,
                    "signature": analysis.permissions_signature,
                    "unknown": analysis.permissions_unknown,
                },
                "permission_counts": {
                    "total": len(analysis.permissions_all),
                    "dangerous": len(analysis.permissions_dangerous),
                    "normal": len(analysis.permissions_normal),
                    "signature": len(analysis.permissions_signature),
                },
                "components": {
                    "activities": {"total": analysis.activities_total, "exported": analysis.activities_exported},
                    "services": {"total": analysis.services_total, "exported": analysis.services_exported},
                    "receivers": {"total": analysis.receivers_total, "exported": analysis.receivers_exported},
                    "providers": {"total": analysis.providers_total, "exported": analysis.providers_exported},
                },
                "flags": {
                    "debuggable": analysis.debuggable,
                    "allow_backup": analysis.allow_backup,
                    "cleartext_traffic": analysis.cleartext_traffic,
                    "has_network_security_config": analysis.network_security_config,
                },
            }
        )
    return {"schema_version": "1.0", "generated_at": _now_iso(), "total_count": len(versions), "versions": versions}


def _build_pdi_payload(analyses: list[APKAnalysisResult], metadata: dict) -> tuple[dict, int]:
    """计算 PDI payload。"""
    calculator = PDICalculator(metadata)
    results = []
    all_pdi_values: list[float] = []
    apps_with_drift = 0
    for package_name, versions in sorted(_group_analyses(analyses).items()):
        sequence = calculator.compute_sequence(versions)
        drift_sequence = []
        for item in sequence:
            components = asdict(item.components)
            pdi = _pdi_from_components(components, calculator.weights)
            all_pdi_values.append(pdi)
            drift_sequence.append(
                {
                    "from_version": item.from_version,
                    "to_version": item.to_version,
                    "from_release_date": _release_date_for(item.from_version),
                    "to_release_date": _release_date_for(item.to_version),
                    "components": components,
                    "pdi": pdi,
                    "details": item.details,
                }
            )
        cumulative = round(sum(item["pdi"] for item in drift_sequence), 4)
        if cumulative > 0:
            apps_with_drift += 1
        results.append(
            {
                "app_id": package_name,
                "app_name": APP_META.get(package_name, {}).get("name", package_name),
                "drift_sequence": drift_sequence,
                "cumulative_pdi": cumulative,
            }
        )
    pdi_values = sorted(all_pdi_values)
    summary = {
        "mean_pdi": round(sum(pdi_values) / len(pdi_values), 4) if pdi_values else 0.0,
        "median_pdi": pdi_values[len(pdi_values) // 2] if pdi_values else 0.0,
        "max_pdi": max(pdi_values) if pdi_values else 0.0,
        "apps_with_drift": apps_with_drift,
        "apps_with_silent_expansion": sum(1 for result in results if any(t["details"]["silent_expansion_groups"] for t in result["drift_sequence"])),
    }
    return {
        "schema_version": "1.0",
        "generated_at": _now_iso(),
        "weights": calculator.weights,
        "summary_stats": summary,
        "results": results,
    }, apps_with_drift


def _pdi_from_components(components: dict, weights: dict) -> float:
    """Compute exported PDI from the same fields validated later."""
    return round(
        float(weights.get("alpha", 0)) * float(components.get("delta_d", 0))
        + float(weights.get("beta", 0)) * float(components.get("delta_s", 0))
        + float(weights.get("gamma", 0)) * float(components.get("delta_c", 0))
        + float(weights.get("delta", 0)) * float(components.get("delta_e", 0)),
        4,
    )


def _build_clri_payload(
    analyses: list[APKAnalysisResult],
    vulnerabilities: list[Vulnerability],
    metadata: dict,
    permission_api_payload: dict,
    component_api_payload: dict,
) -> tuple[dict, list]:
    """计算 CLRI payload。"""
    latest_versions = [max(items, key=lambda item: item.version_code) for items in _group_analyses(analyses).values()]
    calculator = CLRICalculator(permission_api_payload, vulnerabilities, metadata, component_api_payload)
    results = [
        calculator.compute_app_clri(item.package_name, item.permissions_all)
        for item in sorted(latest_versions, key=lambda analysis: analysis.package_name)
    ]
    ranked = sorted(results, key=lambda item: (-item.clri, item.app_id))
    app_scores = []
    for rank, result in enumerate(ranked, start=1):
        meta = APP_META.get(result.app_id, {"name": result.app_id, "category_id": "Development"})
        app_scores.append(result.to_export_dict(rank, meta["name"], meta["category_id"]))
    return {
        "schema_version": "1.0",
        "generated_at": _now_iso(),
        "total_apps": len(app_scores),
        "total_cves_considered": len(vulnerabilities),
        "app_scores": app_scores,
        "permission_vuln_edges": calculator.build_permission_vuln_edges(top_k_per_app=8),
    }, results


def _build_vulnerabilities_payload(vulnerabilities: list[Vulnerability]) -> dict:
    """构建 vulnerabilities.json payload。"""
    months = sorted({vuln.bulletin_date[:7] for vuln in vulnerabilities})
    return {
        "schema_version": "1.0",
        "generated_at": _now_iso(),
        "time_range": {"start": months[0] if months else "", "end": months[-1] if months else ""},
        "total_count": len(vulnerabilities),
        "vulnerabilities": [
            {
                "cve_id": vuln.cve_id,
                "bulletin_date": vuln.bulletin_date,
                "patch_level": vuln.bulletin_date,
                "severity": vuln.severity,
                "type": vuln.type,
                "component": vuln.component,
                "component_category": vuln.component_category,
                "affected_versions": vuln.affected_versions,
                "vendor": vuln.vendor,
                "bulletin_url": vuln.bulletin_url,
            }
            for vuln in vulnerabilities
        ],
    }


def _sync_dashboard_overview_counts(dashboard_payload: dict, apps_payload: dict, app_versions_payload: dict, vulnerabilities_payload: dict) -> None:
    """Keep dashboard overview counters consistent with exported payloads."""
    overview = dashboard_payload.setdefault("overview", {})
    vulnerabilities = vulnerabilities_payload.get("vulnerabilities", [])
    overview.update(
        {
            "total_apps": len(apps_payload.get("apps", [])),
            "total_apk_versions": len(app_versions_payload.get("versions", [])),
            "total_cves": len(vulnerabilities),
            "bulletin_months": len({item.get("bulletin_date", "")[:7] for item in vulnerabilities if item.get("bulletin_date")}),
        }
    )


def _build_permission_api_payload() -> dict:
    """合并权限 API 映射。"""
    merger = PermissionAPIMerger()
    merger.merge_sources(
        _read_json(PIPELINE_ROOT / "data" / "permission_api_pscout.json"),
        _read_json(PIPELINE_ROOT / "data" / "permission_api_axplorer.json"),
        _read_json(PIPELINE_ROOT / "data" / "permission_api_official.json"),
    )
    return merger.as_export_dict()


def _build_comparison_payload() -> dict:
    """构建 comparison.json payload。"""
    base_path = WEB_DATA_DIR / "comparison.json"
    payload = _read_json(base_path) if base_path.exists() else {}
    extractor = ComparisonExtractor()
    payload.update(
        {
            "schema_version": "1.0",
            "generated_at": _now_iso(),
            "data_collection_date": date.today().isoformat(),
            "dimensions": extractor.extract_dimensions(extractor.load_raw(PIPELINE_ROOT / "data" / "comparison_raw.yaml")),
        }
    )
    payload.setdefault("flow_diagrams", {"android": {"nodes": [], "edges": []}, "openharmony": {"nodes": [], "edges": []}})
    payload.setdefault("advantages_disadvantages", {"openharmony_advantages": [], "openharmony_disadvantages": []})
    payload.setdefault("recommendations", [])
    return payload


def _load_analyses(directory: Path) -> list[APKAnalysisResult]:
    """读取 APK 分析缓存。"""
    results = []
    if not directory.exists():
        return results
    for path in sorted(directory.glob("*.json")):
        if path.name.startswith("_"):
            continue
        results.append(APKAnalysisResult(**_read_json(path)))
    return sorted(results, key=lambda item: (item.package_name, item.version_code))


def _load_vulnerabilities(directory: Path) -> list[Vulnerability]:
    """读取 Bulletin 解析结果。"""
    vulnerabilities: list[Vulnerability] = []
    if not directory.exists():
        return vulnerabilities
    for path in sorted(directory.glob("*.json")):
        payload = _read_json(path)
        for item in payload.get("vulnerabilities", []):
            item = dict(item)
            item.setdefault("raw_row", {})
            vulnerabilities.append(Vulnerability(**item))
    return vulnerabilities


def _default_fixture_vulnerabilities() -> list[Vulnerability]:
    """解析内置 Bulletin fixtures 作为兜底漏洞数据。"""
    scraper = BulletinScraper()
    fixtures = [
        (FIXTURE_DIR / "bulletin" / "bulletin_2024_06.html", date(2024, 6, 1)),
        (FIXTURE_DIR / "bulletin" / "bulletin_2024_11_type_first.html", date(2024, 11, 1)),
        (FIXTURE_DIR / "bulletin" / "bulletin_2025_03_merged.html", date(2025, 3, 1)),
    ]
    vulnerabilities: list[Vulnerability] = []
    for path, bulletin_date in fixtures:
        vulnerabilities.extend(scraper._parse(path.read_text(encoding="utf-8"), bulletin_date))
    return vulnerabilities


def _group_analyses(analyses: list[APKAnalysisResult]) -> dict[str, list[APKAnalysisResult]]:
    """按包名分组分析结果。"""
    grouped: dict[str, list[APKAnalysisResult]] = defaultdict(list)
    for analysis in analyses:
        grouped[analysis.package_name].append(analysis)
    return {key: sorted(value, key=lambda item: item.version_code) for key, value in grouped.items()}


def _release_date_for(version_name: str) -> str:
    """为 fixture 版本生成稳定发布日期。"""
    if version_name.endswith(".0.0"):
        return "2026-01-01"
    if version_name.endswith(".1.0"):
        return "2026-02-01"
    return "2026-03-01"


def _offline(ctx: click.Context, command_offline: bool) -> bool:
    """合并全局和命令级 offline 标志。"""
    return bool(command_offline or (ctx.obj or {}).get("offline"))


def _set_offline_env(offline: bool) -> None:
    """设置离线模式环境变量。"""
    if offline:
        os.environ["MSO_OFFLINE"] = "1"


def _resolve_month_range(start: str | None, end: str | None) -> tuple[date, date]:
    """解析月份范围。"""
    if start and end:
        return _parse_month(start), _parse_month(end)
    today = date.today()
    end_date = date(today.year, today.month, 1)
    return _add_months(end_date, -23), end_date


def _parse_month(value: str) -> date:
    """解析 YYYY-MM。"""
    year, month = value.split("-", 1)
    return date(int(year), int(month), 1)


def _add_months(value: date, delta: int) -> date:
    """月份加减。"""
    month_zero = value.year * 12 + value.month - 1 + delta
    return date(month_zero // 12, month_zero % 12 + 1, 1)


def _load_offline_bulletin_html(bulletin_date: date, cache_dir: Path) -> str:
    """读取离线公告 HTML，优先 raw 缓存，缺失时使用 fixture。"""
    cached = cache_dir / f"{bulletin_date:%Y-%m}.html"
    if cached.exists():
        return cached.read_text(encoding="utf-8")
    fixture_dir = FIXTURE_DIR / "bulletin"
    matches = sorted(fixture_dir.glob(f"bulletin_{bulletin_date:%Y_%m}*.html"))
    fixture = matches[0] if matches else fixture_dir / "bulletin_2025_09_empty.html"
    html = fixture.read_text(encoding="utf-8")
    cached.parent.mkdir(parents=True, exist_ok=True)
    cached.write_text(html, encoding="utf-8")
    return html


def _read_json(path: Path) -> dict:
    """读取 JSON 文件。"""
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict) -> None:
    """写入 JSON 文件。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _now_iso() -> str:
    """返回当前 ISO 8601 时间。"""
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    cli()
