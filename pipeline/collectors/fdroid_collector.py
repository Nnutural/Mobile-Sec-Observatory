"""F-Droid application metadata collector."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import logging
import os
import random
import time
from typing import Optional

import yaml

try:
    import requests
except ImportError:  # pragma: no cover - exercised only in minimal environments
    class _MissingRequests:
        """Runtime shim used when requests is not installed."""

        RequestException = RuntimeError

        @staticmethod
        def get(*args: object, **kwargs: object) -> object:
            """Raise a clear error for online fetching without requests."""
            raise RuntimeError("requests is required for online F-Droid fetching")

    requests = _MissingRequests()

logger = logging.getLogger(__name__)

PIPELINE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = PIPELINE_ROOT.parent
DEFAULT_CONFIG = PIPELINE_ROOT / "config" / "samples_selection.yaml"
OFFLINE_INDEX_FIXTURE = PIPELINE_ROOT / "tests" / "fixtures" / "fdroid" / "index-v2.mini.json"
USER_AGENT = "MobileSecObservatory/0.1 (research)"


@dataclass
class FDroidApp:
    """F-Droid application metadata selected for the study sample."""

    package_name: str
    name: str
    category: str
    summary: str
    source_url: Optional[str]
    versions: list["FDroidVersion"]


@dataclass
class FDroidVersion:
    """Single F-Droid APK version metadata."""

    version_name: str
    version_code: int
    apk_filename: str
    release_date: str
    size_bytes: int
    target_sdk: int
    min_sdk: int


class FDroidCollector:
    """Collect and filter F-Droid applications and APK versions."""

    INDEX_URL = "https://f-droid.org/repo/index-v2.json"
    REPO_BASE = "https://f-droid.org/repo"

    def __init__(self, cache_dir: Path):
        """初始化 F-Droid 缓存目录。"""
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch_index(self, force_refresh: bool = False) -> dict:
        """下载或读取缓存的 F-Droid 索引。"""
        cache_file = self.cache_dir / "index-v2.json"
        offline = os.environ.get("MSO_OFFLINE") == "1"
        if offline and OFFLINE_INDEX_FIXTURE.exists():
            logger.info("Using offline F-Droid fixture: %s", OFFLINE_INDEX_FIXTURE)
            return json.loads(OFFLINE_INDEX_FIXTURE.read_text(encoding="utf-8"))

        if cache_file.exists() and not force_refresh and self._is_cache_fresh(cache_file):
            logger.info("Using fresh F-Droid cache: %s", cache_file)
            return json.loads(cache_file.read_text(encoding="utf-8"))

        try:
            response = requests.get(
                self.INDEX_URL,
                headers={"User-Agent": USER_AGENT},
                timeout=30,
            )
            response.raise_for_status()
            cache_file.write_text(response.text, encoding="utf-8")
            return response.json()
        except requests.RequestException as exc:
            if cache_file.exists():
                logger.warning("F-Droid fetch failed, falling back to stale cache: %s", exc)
                return json.loads(cache_file.read_text(encoding="utf-8"))
            raise RuntimeError(f"failed to fetch F-Droid index: {exc}") from exc

    def filter_apps(
        self,
        categories: list[str],
        min_versions: int = 3,
        min_target_sdk: int = 26,
        per_category_count: int = 6,
    ) -> list[FDroidApp]:
        """按类别、版本数、SDK 和体积筛选样本应用。"""
        config = _read_yaml(DEFAULT_CONFIG)
        per_app = config.get("selection_criteria", {}).get("per_app", {})
        max_size_mb = int(per_app.get("max_apk_size_mb", 80))
        max_size_bytes = max_size_mb * 1024 * 1024
        seed = int(config.get("random_seed", 42))
        tie_rng = random.Random(seed)
        tie_breakers: dict[str, float] = {}

        index = self.fetch_index()
        packages = index.get("packages", {})
        if not isinstance(packages, dict):
            raise ValueError("F-Droid index missing packages object")

        selected: list[FDroidApp] = []
        selected_names: set[str] = set()
        requested_categories = list(categories)

        for category in requested_categories:
            candidates: list[FDroidApp] = []
            for package_name, package_data in packages.items():
                if package_name in selected_names:
                    continue
                app_categories = set(package_data.get("metadata", {}).get("categories", []))
                if category not in app_categories:
                    continue

                versions = self._parse_versions(package_data, max_size_bytes)
                if len(versions) < min_versions:
                    continue
                latest_by_code = max(versions, key=lambda item: item.version_code)
                if latest_by_code.target_sdk < min_target_sdk:
                    continue

                latest_three = sorted(
                    sorted(versions, key=lambda item: item.version_code, reverse=True)[:3],
                    key=lambda item: item.release_date,
                )
                if len(latest_three) < min_versions:
                    continue

                metadata = package_data.get("metadata", {})
                candidates.append(
                    FDroidApp(
                        package_name=package_name,
                        name=str(metadata.get("name", package_name)),
                        category=category,
                        summary=str(metadata.get("summary", "")),
                        source_url=metadata.get("sourceCode") or metadata.get("sourceCodeUrl"),
                        versions=latest_three,
                    )
                )

            candidates.sort(
                key=lambda app: (
                    self._latest_release_timestamp(app.versions),
                    tie_breakers.setdefault(app.package_name, tie_rng.random()),
                ),
                reverse=True,
            )
            category_selected = candidates[:per_category_count]
            selected.extend(category_selected)
            selected_names.update(app.package_name for app in category_selected)
            logger.info("Selected %d apps for category %s", len(category_selected), category)

        return selected

    def download_apk(
        self,
        app: FDroidApp,
        version: FDroidVersion,
        max_retries: int = 3,
    ) -> Path:
        """下载单个 APK 文件并校验 sha256。"""
        apk_dir = self.cache_dir.parent / "apks"
        apk_dir.mkdir(parents=True, exist_ok=True)
        target = apk_dir / f"{app.package_name}__{version.version_code}.apk"
        expected_sha256 = self._find_version_sha256(app.package_name, version.version_code)

        if target.exists() and expected_sha256 and _sha256(target) == expected_sha256:
            logger.info("APK already exists with matching sha256: %s", target)
            return target

        url = f"{self.REPO_BASE}/{version.apk_filename}"
        last_error: Exception | None = None
        for attempt in range(max_retries):
            try:
                logger.info("Downloading APK %s (%d/%d)", url, attempt + 1, max_retries)
                with requests.get(
                    url,
                    headers={"User-Agent": USER_AGENT},
                    stream=True,
                    timeout=30,
                ) as response:
                    response.raise_for_status()
                    with target.open("wb") as handle:
                        for chunk in response.iter_content(chunk_size=64 * 1024):
                            if chunk:
                                handle.write(chunk)
                if expected_sha256 and _sha256(target) != expected_sha256:
                    target.unlink(missing_ok=True)
                    raise RuntimeError(f"sha256 mismatch for {target.name}")
                return target
            except (requests.RequestException, RuntimeError) as exc:
                last_error = exc
                logger.warning("APK download failed for %s: %s", version.apk_filename, exc)
                time.sleep(2**attempt)

        raise RuntimeError(f"failed to download APK after {max_retries} attempts: {url}") from last_error

    def _parse_versions(self, package_data: dict, max_size_bytes: int) -> list[FDroidVersion]:
        """解析 index v2 中的版本节点。"""
        versions: list[FDroidVersion] = []
        raw_versions = package_data.get("versions", {})
        if not isinstance(raw_versions, dict):
            return versions

        for raw_version in raw_versions.values():
            file_info = raw_version.get("file", {})
            manifest = raw_version.get("manifest", {})
            uses_sdk = manifest.get("usesSdk", {})
            size_bytes = int(file_info.get("size") or 0)
            if size_bytes > max_size_bytes:
                continue
            filename = file_info.get("name")
            version_code = raw_version.get("versionCode") or manifest.get("versionCode")
            version_name = raw_version.get("versionName") or manifest.get("versionName")
            if filename is None or version_code is None or version_name is None:
                continue
            versions.append(
                FDroidVersion(
                    version_name=str(version_name),
                    version_code=int(version_code),
                    apk_filename=str(filename),
                    release_date=_format_release_date(raw_version.get("added")),
                    size_bytes=size_bytes,
                    target_sdk=int(uses_sdk.get("targetSdkVersion") or 0),
                    min_sdk=int(uses_sdk.get("minSdkVersion") or 0),
                )
            )
        return versions

    def _find_version_sha256(self, package_name: str, version_code: int) -> str | None:
        """从索引中查询指定版本的 sha256。"""
        package_data = self.fetch_index().get("packages", {}).get(package_name, {})
        for raw_version in package_data.get("versions", {}).values():
            raw_code = raw_version.get("versionCode") or raw_version.get("manifest", {}).get("versionCode")
            if int(raw_code or -1) == version_code:
                return raw_version.get("file", {}).get("sha256")
        return None

    @staticmethod
    def _latest_release_timestamp(versions: list[FDroidVersion]) -> float:
        """返回版本序列中最新发布日期的时间戳。"""
        latest = max(version.release_date for version in versions)
        return datetime.fromisoformat(latest).timestamp()

    @staticmethod
    def _is_cache_fresh(cache_file: Path) -> bool:
        """判断缓存是否在 7 天有效期内。"""
        return (time.time() - cache_file.stat().st_mtime) < 7 * 24 * 60 * 60


def select_sample(yaml_path: Path) -> list[FDroidApp]:
    """读取样本配置并返回筛选后的 F-Droid 应用列表。"""
    config = _read_yaml(yaml_path)
    criteria = config.get("selection_criteria", {})
    categories = [item["id"] for item in criteria.get("categories", [])]
    per_app = criteria.get("per_app", {})
    collector = FDroidCollector(cache_dir=PIPELINE_ROOT / "raw" / "fdroid")
    return collector.filter_apps(
        categories=categories,
        min_versions=int(per_app.get("min_versions", 3)),
        min_target_sdk=int(per_app.get("min_target_sdk", 26)),
        per_category_count=int(criteria.get("categories", [{}])[0].get("count", 6)),
    )


def fdroid_apps_to_dicts(apps: list[FDroidApp]) -> list[dict]:
    """把 FDroidApp 序列化为 JSON 友好的 dict。"""
    return [asdict(app) for app in apps]


def _read_yaml(path: Path) -> dict:
    """读取 YAML 配置。"""
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def _format_release_date(value: object) -> str:
    """把 F-Droid added 字段转换为 YYYY-MM-DD。"""
    if isinstance(value, (int, float)):
        timestamp = float(value) / 1000 if float(value) > 10_000_000_000 else float(value)
        return datetime.fromtimestamp(timestamp, tz=timezone.utc).date().isoformat()
    if isinstance(value, str):
        text = value.strip()
        if text.isdigit():
            return _format_release_date(int(text))
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            return text[:10]
    return datetime.now(tz=timezone.utc).date().isoformat()


def _sha256(path: Path) -> str:
    """计算文件 sha256。"""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
