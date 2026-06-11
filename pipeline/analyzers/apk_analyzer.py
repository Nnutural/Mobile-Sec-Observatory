"""APK static analysis skeleton based on androguard."""

from dataclasses import dataclass
from pathlib import Path


@dataclass
class APKAnalysisResult:
    """Static analysis result for one APK version."""

    package_name: str
    version_name: str
    version_code: int
    apk_path: str
    apk_size_kb: int
    apk_sha256: str
    target_sdk: int
    min_sdk: int
    compile_sdk: int
    permissions_all: list[str]
    permissions_dangerous: list[str]
    permissions_normal: list[str]
    permissions_signature: list[str]
    permissions_unknown: list[str]
    activities_total: int
    activities_exported: int
    services_total: int
    services_exported: int
    receivers_total: int
    receivers_exported: int
    providers_total: int
    providers_exported: int
    debuggable: bool
    allow_backup: bool
    cleartext_traffic: bool
    network_security_config: bool
    signature_scheme: str
    analyzed_at: str


class APKAnalyzer:
    """Analyze APK manifests, permissions, components, and security flags."""

    def __init__(self, permissions_metadata: dict):
        """Initialize analyzer with permission metadata."""
        self.perm_meta = permissions_metadata

    def analyze(self, apk_path: Path) -> APKAnalysisResult:
        """分析单个 APK,返回完整结果。"""
        raise NotImplementedError("TODO: implement in week 1/2")

    def _categorize(self, permissions: list[str]) -> tuple[list[str], list[str], list[str], list[str]]:
        """按权限元数据分类。"""
        raise NotImplementedError("TODO: implement in week 1/2")

    def _extract_exported_components(self, apk: object) -> dict:
        """提取所有 exported=true 的组件。"""
        raise NotImplementedError("TODO: implement in week 1/2")
