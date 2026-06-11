"""F-Droid application metadata collector skeleton."""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional


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
        """Initialize collector cache location."""
        self.cache_dir = cache_dir

    def fetch_index(self, force_refresh: bool = False) -> dict:
        """下载或读取缓存的 F-Droid 索引。"""
        raise NotImplementedError("TODO: implement in week 1/2")

    def filter_apps(
        self,
        categories: list[str],
        min_versions: int = 3,
        min_target_sdk: int = 26,
        per_category_count: int = 6,
    ) -> list[FDroidApp]:
        """按选择标准筛选应用。"""
        raise NotImplementedError("TODO: implement in week 1/2")

    def download_apk(
        self,
        app: FDroidApp,
        version: FDroidVersion,
        max_retries: int = 3,
    ) -> Path:
        """下载单个 APK 文件,支持重试。"""
        raise NotImplementedError("TODO: implement in week 1/2")
