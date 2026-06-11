"""Permission Drift Index calculator."""

from __future__ import annotations

from dataclasses import dataclass

from pipeline.analyzers.apk_analyzer import APKAnalysisResult


@dataclass
class PDIComponents:
    """PDI component values for one version transition."""

    delta_d: float
    delta_s: int
    delta_c: int
    delta_e: int


@dataclass
class PDIResult:
    """PDI result for one pair of APK versions."""

    from_version: str
    to_version: str
    components: PDIComponents
    pdi: float
    details: dict


class PDICalculator:
    """Calculate Permission Drift Index sequences for app versions."""

    NETWORK_PERMISSIONS = {
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.CHANGE_NETWORK_STATE",
        "android.permission.CHANGE_WIFI_STATE",
    }

    def __init__(self, permissions_metadata: dict, weights: dict | None = None):
        """初始化 PDI 计算器。"""
        self.perm_meta = permissions_metadata.get("permissions", permissions_metadata)
        self.weights = weights or {"alpha": 0.30, "beta": 0.40, "gamma": 0.20, "delta": 0.10}

    def compute_sequence(self, ordered_versions: list[APKAnalysisResult]) -> list[PDIResult]:
        """计算同一应用多版本 PDI 序列。"""
        if len(ordered_versions) < 2:
            return []
        package_names = {item.package_name for item in ordered_versions}
        if len(package_names) != 1:
            raise ValueError("PDI sequence requires versions from the same package")
        versions = sorted(ordered_versions, key=lambda item: item.version_code)
        return [self._compute_pair(versions[i - 1], versions[i]) for i in range(1, len(versions))]

    def _compute_pair(self, prev: APKAnalysisResult, curr: APKAnalysisResult) -> PDIResult:
        """计算相邻版本的 PDI 分量与总分。"""
        prev_dangerous = set(prev.permissions_dangerous)
        curr_dangerous = set(curr.permissions_dangerous)
        prev_all = set(prev.permissions_all)
        curr_all = set(curr.permissions_all)

        new_dangerous = curr_dangerous - prev_dangerous
        delta_d = sum(float(self.perm_meta.get(permission, {}).get("weight", 0.5)) for permission in new_dangerous)

        prev_groups = self._extract_groups(prev.permissions_all)
        silent_groups = {
            self.perm_meta.get(permission, {}).get("group")
            for permission in (curr_all - prev_all)
            if self.perm_meta.get(permission, {}).get("group") in prev_groups
        }
        silent_groups.discard(None)
        delta_s = sum(
            1
            for permission in (curr_all - prev_all)
            if self.perm_meta.get(permission, {}).get("group") in prev_groups
        )

        delta_c = self._compute_combo_delta(prev, curr)
        delta_e = _exported_total(curr) - _exported_total(prev)
        pdi = (
            float(self.weights["alpha"]) * delta_d
            + float(self.weights["beta"]) * delta_s
            + float(self.weights["gamma"]) * delta_c
            + float(self.weights["delta"]) * delta_e
        )

        return PDIResult(
            from_version=prev.version_name,
            to_version=curr.version_name,
            components=PDIComponents(delta_d=round(delta_d, 4), delta_s=delta_s, delta_c=delta_c, delta_e=delta_e),
            pdi=round(pdi, 4),
            details={
                "new_dangerous_permissions": sorted(new_dangerous),
                "silent_expansion_groups": sorted(group for group in silent_groups if isinstance(group, str)),
                "removed_permissions": sorted(prev_all - curr_all),
            },
        )

    def _extract_groups(self, permissions: list[str]) -> set[str]:
        """提取权限列表中出现过的权限组。"""
        return {
            group
            for permission in permissions
            if (group := self.perm_meta.get(permission, {}).get("group"))
        }

    def _compute_combo_delta(self, prev: APKAnalysisResult, curr: APKAnalysisResult) -> int:
        """计算网络权限与危险权限组合数量差。"""
        return self._combo(curr.permissions_all) - self._combo(prev.permissions_all)

    def _combo(self, permissions: list[str]) -> int:
        """计算单版本网络-危险权限组合数量。"""
        permission_set = set(permissions)
        network_count = len(permission_set & self.NETWORK_PERMISSIONS)
        dangerous_count = sum(
            1
            for permission in permission_set
            if self.perm_meta.get(permission, {}).get("level") == "dangerous"
        )
        return network_count * dangerous_count


def _exported_total(result: APKAnalysisResult) -> int:
    """统计四类暴露组件总数。"""
    return (
        result.activities_exported
        + result.services_exported
        + result.receivers_exported
        + result.providers_exported
    )
