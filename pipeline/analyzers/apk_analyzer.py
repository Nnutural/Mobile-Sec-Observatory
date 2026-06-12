"""APK static analysis based on androguard with manifest-only fixture support."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import re
import xml.etree.ElementTree as ET
import zipfile

ANDROID_NS = "http://schemas.android.com/apk/res/android"


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
        """初始化 APK 分析器。"""
        self.perm_meta = permissions_metadata.get("permissions", permissions_metadata)

    def analyze(self, apk_path: Path) -> APKAnalysisResult:
        """分析单个 APK 或 manifest fixture。"""
        apk_path = Path(apk_path)
        if apk_path.name.endswith(".manifest.xml"):
            root = ET.fromstring(apk_path.read_text(encoding="utf-8"))
            return self._result_from_manifest(apk_path, root, signature_scheme="manifest-only")

        apk = self._load_apk(apk_path)
        if apk is not None:
            try:
                root = self._manifest_root_from_apk_object(apk)
            except Exception:
                root = parse_manifest_xml(apk_path)
            permissions = self._safe_call(apk, "get_permissions") or self._permissions_from_manifest(root)
            dangerous, normal, signature, unknown = self._categorize(list(permissions))
            components = self._extract_exported_components(apk)
            target_sdk = _to_int(self._safe_call(apk, "get_target_sdk_version"))
            min_sdk = _to_int(self._safe_call(apk, "get_min_sdk_version"))
            compile_sdk = _to_int(root.attrib.get("platformBuildVersionCode")) or target_sdk
            app_node = root.find("application")
            return APKAnalysisResult(
                package_name=str(self._safe_call(apk, "get_package") or root.attrib.get("package") or _infer_package(apk_path)),
                version_name=str(self._safe_call(apk, "get_androidversion_name") or _android_attr(root, "versionName") or "0"),
                version_code=_to_int(self._safe_call(apk, "get_androidversion_code") or _android_attr(root, "versionCode")),
                apk_path=str(apk_path),
                apk_size_kb=round(apk_path.stat().st_size / 1024),
                apk_sha256=_sha256(apk_path),
                target_sdk=target_sdk,
                min_sdk=min_sdk,
                compile_sdk=compile_sdk,
                permissions_all=sorted(permissions),
                permissions_dangerous=dangerous,
                permissions_normal=normal,
                permissions_signature=signature,
                permissions_unknown=unknown,
                activities_total=components["activity"][0],
                activities_exported=components["activity"][1],
                services_total=components["service"][0],
                services_exported=components["service"][1],
                receivers_total=components["receiver"][0],
                receivers_exported=components["receiver"][1],
                providers_total=components["provider"][0],
                providers_exported=components["provider"][1],
                debuggable=_bool_attr(app_node, "debuggable", default=False),
                allow_backup=_bool_attr(app_node, "allowBackup", default=True),
                cleartext_traffic=self._cleartext_traffic(app_node, target_sdk),
                network_security_config=bool(_android_attr(app_node, "networkSecurityConfig")),
                signature_scheme=self._signature_scheme(apk),
                analyzed_at=datetime.now(timezone.utc).isoformat(),
            )

        root = parse_manifest_xml(apk_path)
        return self._result_from_manifest(apk_path, root, signature_scheme="unknown")

    def _categorize(self, permissions: list[str]) -> tuple[list[str], list[str], list[str], list[str]]:
        """按权限元数据分类，返回 dangerous/normal/signature/unknown。"""
        dangerous: list[str] = []
        normal: list[str] = []
        signature: list[str] = []
        unknown: list[str] = []
        for permission in permissions:
            level = self.perm_meta.get(permission, {}).get("level")
            if level == "dangerous":
                dangerous.append(permission)
            elif level == "normal":
                normal.append(permission)
            elif level in {"signature", "signatureOrSystem"}:
                signature.append(permission)
            else:
                unknown.append(permission)
        return sorted(dangerous), sorted(normal), sorted(signature), sorted(unknown)

    def _extract_exported_components(self, apk: object) -> dict:
        """统计显式 exported=true 的四类组件；含 intent-filter 但未显式声明时不算 exported。"""
        root = apk if isinstance(apk, ET.Element) else self._manifest_root_from_apk_object(apk)
        result: dict[str, tuple[int, int]] = {}
        for tag, key in [
            ("activity", "activity"),
            ("service", "service"),
            ("receiver", "receiver"),
            ("provider", "provider"),
        ]:
            nodes = [node for node in root.iter() if _local_name(node.tag) == tag]
            exported = [node for node in nodes if _is_exported_component(node, tag)]
            result[key] = (len(nodes), len(exported))
        return result

    def _result_from_manifest(self, apk_path: Path, root: ET.Element, signature_scheme: str) -> APKAnalysisResult:
        """从普通 XML manifest 构造分析结果。"""
        permissions = self._permissions_from_manifest(root)
        dangerous, normal, signature, unknown = self._categorize(permissions)
        components = self._extract_exported_components(root)
        uses_sdk = _first_child(root, "uses-sdk")
        app_node = _first_child(root, "application")
        target_sdk = _to_int(_android_attr(uses_sdk, "targetSdkVersion"))
        min_sdk = _to_int(_android_attr(uses_sdk, "minSdkVersion"))
        compile_sdk = _to_int(root.attrib.get("platformBuildVersionCode")) or target_sdk
        version_code = _to_int(_android_attr(root, "versionCode") or _infer_version_code(apk_path))
        version_name = _android_attr(root, "versionName") or str(version_code)
        return APKAnalysisResult(
            package_name=root.attrib.get("package") or _infer_package(apk_path),
            version_name=version_name,
            version_code=version_code,
            apk_path=str(apk_path),
            apk_size_kb=round(apk_path.stat().st_size / 1024),
            apk_sha256=_sha256(apk_path),
            target_sdk=target_sdk,
            min_sdk=min_sdk,
            compile_sdk=compile_sdk,
            permissions_all=permissions,
            permissions_dangerous=dangerous,
            permissions_normal=normal,
            permissions_signature=signature,
            permissions_unknown=unknown,
            activities_total=components["activity"][0],
            activities_exported=components["activity"][1],
            services_total=components["service"][0],
            services_exported=components["service"][1],
            receivers_total=components["receiver"][0],
            receivers_exported=components["receiver"][1],
            providers_total=components["provider"][0],
            providers_exported=components["provider"][1],
            debuggable=_bool_attr(app_node, "debuggable", default=False),
            allow_backup=_bool_attr(app_node, "allowBackup", default=True),
            cleartext_traffic=self._cleartext_traffic(app_node, target_sdk),
            network_security_config=bool(_android_attr(app_node, "networkSecurityConfig")),
            signature_scheme=signature_scheme,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
        )

    @staticmethod
    def _load_apk(apk_path: Path) -> object | None:
        """加载 androguard APK 对象。"""
        try:
            try:
                from androguard.core.bytecodes.apk import APK
            except ImportError:
                from androguard.core.apk import APK
            return APK(str(apk_path))
        except ImportError:
            return None

    @staticmethod
    def _safe_call(apk: object, method_name: str) -> object | None:
        """安全调用 androguard 方法。"""
        method = getattr(apk, method_name, None)
        if not callable(method):
            return None
        try:
            return method()
        except Exception:
            return None

    @staticmethod
    def _manifest_root_from_apk_object(apk: object) -> ET.Element:
        """从 androguard APK 对象读取 manifest XML 根节点。"""
        manifest = getattr(apk, "get_android_manifest_xml")()
        if isinstance(manifest, ET.ElementTree):
            return manifest.getroot()
        if isinstance(manifest, ET.Element):
            return manifest
        return ET.fromstring(ET.tostring(manifest))

    @staticmethod
    def _permissions_from_manifest(root: ET.Element) -> list[str]:
        """从 manifest XML 读取 uses-permission。"""
        permissions = []
        for node in root.iter():
            if _local_name(node.tag) == "uses-permission":
                name = _android_attr(node, "name")
                if name:
                    permissions.append(name)
        return sorted(set(permissions))

    @staticmethod
    def _cleartext_traffic(app_node: ET.Element | None, target_sdk: int) -> bool:
        """计算 usesCleartextTraffic 默认值。"""
        explicit = _android_attr(app_node, "usesCleartextTraffic")
        if explicit is not None:
            return explicit.lower() == "true"
        return target_sdk < 28

    @staticmethod
    def _signature_scheme(apk: object) -> str:
        """推断 APK 签名方案。"""
        for scheme in ["v4", "v3", "v2", "v1"]:
            method = getattr(apk, f"is_signed_{scheme}", None)
            if callable(method):
                try:
                    if method():
                        return scheme
                except Exception:
                    continue
        return "unknown"


def parse_manifest_xml(apk_path: Path) -> ET.Element:
    """从 APK zip 中解析 AndroidManifest.xml；普通 XML fixture 直接解析。"""
    if apk_path.name.endswith(".manifest.xml"):
        return ET.fromstring(apk_path.read_text(encoding="utf-8"))
    with zipfile.ZipFile(apk_path) as archive:
        manifest_bytes = archive.read("AndroidManifest.xml")
    try:
        from androguard.core.bytecodes.axml import AXMLPrinter
    except ImportError:
        try:
            from androguard.core.axml import AXMLPrinter
        except ImportError as exc:
            raise RuntimeError("androguard AXMLPrinter is required to decode binary AndroidManifest.xml") from exc
    xml_bytes = AXMLPrinter(manifest_bytes).get_xml()
    return ET.fromstring(xml_bytes)


def _android_attr(node: ET.Element | None, name: str) -> str | None:
    """读取 android 命名空间属性。"""
    if node is None:
        return None
    return node.attrib.get(f"{{{ANDROID_NS}}}{name}") or node.attrib.get(f"android:{name}") or node.attrib.get(name)


def _bool_attr(node: ET.Element | None, name: str, default: bool) -> bool:
    """读取布尔属性。"""
    value = _android_attr(node, name)
    if value is None:
        return default
    return value in {"true", "True"}


def _first_child(root: ET.Element, tag: str) -> ET.Element | None:
    """按 local-name 查找第一个子节点。"""
    for node in root.iter():
        if _local_name(node.tag) == tag:
            return node
    return None


def _local_name(tag: str) -> str:
    """提取 XML local-name。"""
    return tag.rsplit("}", 1)[-1]


def _is_exported_component(node: ET.Element, tag: str) -> bool:
    """Infer exported status for real APK manifests without broadening dataclass fields."""
    explicit = _android_attr(node, "exported")
    if explicit is not None:
        return explicit.lower() == "true"
    if tag != "activity":
        return False
    for child in node:
        if _local_name(child.tag) != "intent-filter":
            continue
        actions = {_android_attr(grandchild, "name") for grandchild in child if _local_name(grandchild.tag) == "action"}
        categories = {_android_attr(grandchild, "name") for grandchild in child if _local_name(grandchild.tag) == "category"}
        if "android.intent.action.MAIN" in actions and "android.intent.category.LAUNCHER" in categories:
            return True
    return False


def _to_int(value: object) -> int:
    """安全转换整数。"""
    try:
        return int(value) if value not in (None, "") else 0
    except (TypeError, ValueError):
        return 0


def _infer_package(path: Path) -> str:
    """从 fixture 文件名推断包名。"""
    return path.name.split("__", 1)[0]


def _infer_version_code(path: Path) -> int:
    """从 fixture 文件名推断 versionCode。"""
    match = re.search(r"__(\d+)", path.name)
    return int(match.group(1)) if match else 0


def _sha256(path: Path) -> str:
    """流式计算 sha256。"""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
