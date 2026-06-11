"""Data quality validation."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import json

try:
    import jsonschema
except ImportError:  # pragma: no cover - minimal environment fallback
    jsonschema = None


@dataclass
class ValidationReport:
    """Validation report container."""

    passed: bool = True
    messages: list[str] = field(default_factory=list)

    def add_error(self, message: str) -> None:
        """记录校验错误。"""
        self.passed = False
        self.messages.append(message)

    def to_text(self) -> str:
        """输出 CLI 友好的报告文本。"""
        if self.passed:
            return "ValidationReport: PASS"
        return "ValidationReport: FAIL\n" + "\n".join(self.messages)


class DataQualityValidator:
    """对生成的 JSON 进行 Schema 校验与统计一致性校验。"""

    REQUIRED_FILES = [
        "apps.json",
        "app_versions.json",
        "permissions_metadata.json",
        "pdi_results.json",
        "vulnerabilities.json",
        "clri_matrix.json",
        "comparison.json",
        "dashboard_stats.json",
        "permission_api_map.json",
        "component_api_map.json",
    ]

    SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"

    def validate_all(self, data_dir: Path) -> ValidationReport:
        """依次执行 schema、引用完整性和统计一致性校验。"""
        report = ValidationReport()
        for partial in [
            self._validate_schema(data_dir),
            self._validate_referential_integrity(data_dir),
            self._validate_statistical_consistency(data_dir),
        ]:
            if not partial.passed:
                report.passed = False
            report.messages.extend(partial.messages)
        return report

    def _validate_schema(self, data_dir: Path) -> ValidationReport:
        """使用 JSON Schema 校验所有输出文件。"""
        report = ValidationReport()
        for filename in self.REQUIRED_FILES:
            path = data_dir / filename
            if not path.exists():
                report.add_error(f"[schema] {filename}: missing file")
                continue
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                report.add_error(f"[schema] {filename}: {exc}")
                continue
            schema_path = self.SCHEMA_DIR / filename.replace(".json", ".schema.json")
            if jsonschema is None:
                if payload.get("schema_version") != "1.0" or not isinstance(payload.get("generated_at"), str):
                    report.add_error(f"[schema] {filename}: missing schema_version/generated_at")
                continue
            try:
                schema = json.loads(schema_path.read_text(encoding="utf-8"))
                jsonschema.validate(payload, schema)
            except Exception as exc:
                message = getattr(exc, "message", str(exc))
                report.add_error(f"[schema] {filename}: {message}")
        return report

    def _validate_referential_integrity(self, data_dir: Path) -> ValidationReport:
        """检查跨文件引用完整性。"""
        report = ValidationReport()
        data = _load_many(data_dir)
        if not data:
            report.add_error("[ref] missing required data files")
            return report

        app_ids = {app["id"] for app in data["apps.json"].get("apps", [])}
        app_versions: dict[str, set[str]] = {}
        for version in data["app_versions.json"].get("versions", []):
            app_id = version.get("app_id")
            if app_id not in app_ids:
                report.add_error(f"[ref] app_versions references unknown app_id {app_id}")
            app_versions.setdefault(app_id, set()).add(version.get("version_name"))

        for result in data["pdi_results.json"].get("results", []):
            app_id = result.get("app_id")
            versions = app_versions.get(app_id, set())
            for transition in result.get("drift_sequence", []):
                if transition.get("from_version") not in versions:
                    report.add_error(f"[ref] pdi from_version dangling for {app_id}: {transition.get('from_version')}")
                if transition.get("to_version") not in versions:
                    report.add_error(f"[ref] pdi to_version dangling for {app_id}: {transition.get('to_version')}")

        cve_ids = {item["cve_id"] for item in data["vulnerabilities.json"].get("vulnerabilities", [])}
        for app_score in data["clri_matrix.json"].get("app_scores", []):
            if app_score.get("app_id") not in app_ids:
                report.add_error(f"[ref] clri_matrix references unknown app_id {app_score.get('app_id')}")
        for edge in data["clri_matrix.json"].get("permission_vuln_edges", []):
            if edge.get("target") not in cve_ids:
                report.add_error(f"[ref] permission_vuln_edges target dangling: {edge.get('target')}")

        overview = data["dashboard_stats.json"].get("overview", {})
        if overview.get("total_apps") != len(app_ids):
            report.add_error("[ref] dashboard_stats.overview.total_apps mismatch")
        return report

    def _validate_statistical_consistency(self, data_dir: Path) -> ValidationReport:
        """检查 PDI、Dashboard 与 CLRI 统计一致性。"""
        report = ValidationReport()
        data = _load_many(data_dir)
        if not data:
            report.add_error("[stats] missing required data files")
            return report
        pdi_data = data["pdi_results.json"]
        weights = pdi_data.get("weights", {})
        for result in pdi_data.get("results", []):
            for transition in result.get("drift_sequence", []):
                components = transition.get("components", {})
                expected = (
                    float(weights.get("alpha", 0)) * float(components.get("delta_d", 0))
                    + float(weights.get("beta", 0)) * float(components.get("delta_s", 0))
                    + float(weights.get("gamma", 0)) * float(components.get("delta_c", 0))
                    + float(weights.get("delta", 0)) * float(components.get("delta_e", 0))
                )
                if abs(expected - float(transition.get("pdi", 0))) > 1e-3:
                    report.add_error(f"[stats] pdi mismatch {result.get('app_id')} {transition.get('from_version')}->{transition.get('to_version')}")

        vulns = data["vulnerabilities.json"].get("vulnerabilities", [])
        apps = data["apps.json"].get("apps", [])
        overview = data["dashboard_stats.json"].get("overview", {})
        if overview.get("total_cves") != len(vulns):
            report.add_error("[stats] dashboard_stats.overview.total_cves mismatch")
        if len(data["clri_matrix.json"].get("app_scores", [])) != len(apps):
            report.add_error("[stats] clri_matrix.app_scores count mismatch")
        return report


def _load_many(data_dir: Path) -> dict[str, dict]:
    """读取全部必需 JSON。"""
    loaded: dict[str, dict] = {}
    for filename in DataQualityValidator.REQUIRED_FILES:
        path = data_dir / filename
        if not path.exists():
            return {}
        loaded[filename] = json.loads(path.read_text(encoding="utf-8"))
    return loaded
