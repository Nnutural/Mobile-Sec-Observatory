"""Component-linked Risk Index calculator."""

from __future__ import annotations

from dataclasses import dataclass

from pipeline.collectors.bulletin_scraper import Vulnerability


@dataclass
class CLRIResult:
    """CLRI score and explanations for one application."""

    app_id: str
    clri: float
    top_risk_permissions: list[dict]
    top_associated_cves: list[dict]
    component_breakdown: dict

    def to_export_dict(self, rank: int, app_name: str, category: str) -> dict:
        """输出 clri_matrix.json 中 AppCLRI 结构。"""
        return {
            "app_id": self.app_id,
            "app_name": app_name,
            "category": category,
            "clri": self.clri,
            "rank": rank,
            "top_risk_permissions": self.top_risk_permissions,
            "top_associated_cves": self.top_associated_cves,
            "component_breakdown": self.component_breakdown,
        }


class CLRICalculator:
    """Calculate permission-to-vulnerability linked risk scores."""

    SEVERITY_SCORE = {
        "Critical": 4.0,
        "High": 3.0,
        "Moderate": 2.0,
        "Low": 1.0,
    }

    def __init__(
        self,
        permission_api_map: dict,
        vulnerabilities: list[Vulnerability],
        permissions_metadata: dict,
        component_api_map: dict,
    ):
        """初始化 CLRI 计算器。"""
        self.perm_api = _normalize_permission_api_map(permission_api_map)
        self.vulns = vulnerabilities
        self.perm_meta = permissions_metadata.get("permissions", permissions_metadata)
        self.comp_api = _normalize_component_api_map(component_api_map)
        self._vuln_api_cache = self._precompute_vuln_apis()
        self._computed_edges: list[dict] = []

    def _precompute_vuln_apis(self) -> dict[str, set[str]]:
        """对每个 CVE，根据组件类别查找涉及 API 集合。"""
        cache: dict[str, set[str]] = {}
        for vuln in self.vulns:
            cache[vuln.cve_id] = set(self.comp_api.get(vuln.component_category, set()))
        return cache

    def compute_rho(self, permission: str, cve_id: str) -> float:
        """计算单个权限-CVE 关联强度。"""
        perm_apis = self.perm_api.get(permission, set())
        if not perm_apis:
            return 0.0
        vuln_apis = self._vuln_api_cache.get(cve_id, set())
        if not vuln_apis:
            return 0.0
        return len(perm_apis & vuln_apis) / len(perm_apis)

    def compute_app_clri(self, app_id: str, app_permissions: list[str]) -> CLRIResult:
        """计算单个应用的 CLRI。"""
        if not app_permissions:
            return CLRIResult(app_id, 0.0, [], [], {})

        clri = 0.0
        permission_contributions: dict[str, float] = {}
        cve_associations: dict[str, dict] = {}
        component_breakdown: dict[str, float] = {}

        for permission in sorted(set(app_permissions)):
            weight = float(self.perm_meta.get(permission, {}).get("weight", 0.5))
            permission_total = 0.0
            for vuln in self.vulns:
                rho = self.compute_rho(permission, vuln.cve_id)
                if rho <= 0:
                    continue
                severity_score = self.SEVERITY_SCORE.get(vuln.severity, 0.0)
                contribution = rho * severity_score * weight
                permission_total += contribution
                clri += contribution

                association = cve_associations.setdefault(
                    vuln.cve_id,
                    {
                        "rho": rho,
                        "severity": vuln.severity,
                        "component_category": vuln.component_category,
                        "total": 0.0,
                    },
                )
                association["rho"] = max(float(association["rho"]), rho)
                association["total"] += contribution
                component_breakdown[vuln.component_category] = component_breakdown.get(vuln.component_category, 0.0) + contribution
                self._computed_edges.append(
                    {
                        "source": permission,
                        "target": vuln.cve_id,
                        "weight": round(rho * severity_score, 4),
                        "rho": round(rho, 4),
                    }
                )
            if permission_total > 0:
                permission_contributions[permission] = permission_total

        top_permissions = sorted(permission_contributions.items(), key=lambda item: (-item[1], item[0]))[:5]
        top_cves = sorted(cve_associations.items(), key=lambda item: (-item[1]["total"], item[0]))[:10]
        return CLRIResult(
            app_id=app_id,
            clri=round(clri, 2),
            top_risk_permissions=[
                {"permission": permission, "contribution": round(value, 2)}
                for permission, value in top_permissions
            ],
            top_associated_cves=[
                {
                    "cve_id": cve_id,
                    "rho": round(float(info["rho"]), 4),
                    "severity": info["severity"],
                    "component_category": info["component_category"],
                    "contribution": round(float(info["total"]), 2),
                }
                for cve_id, info in top_cves
            ],
            component_breakdown={
                component: round(value, 2)
                for component, value in sorted(component_breakdown.items())
            },
        )

    def build_permission_vuln_edges(self, top_k_per_app: int = 8) -> list[dict]:
        """输出去重后的权限-CVE 边。"""
        dedup: dict[tuple[str, str], dict] = {}
        for edge in self._computed_edges:
            key = (edge["source"], edge["target"])
            if key not in dedup or edge["weight"] > dedup[key]["weight"]:
                dedup[key] = {
                    "source": edge["source"],
                    "target": edge["target"],
                    "weight": edge["weight"],
                    "rho": edge["rho"],
                }
        return sorted(dedup.values(), key=lambda item: (-item["weight"], item["source"], item["target"]))[:top_k_per_app * max(1, len(dedup))]


def _normalize_permission_api_map(permission_api_map: dict) -> dict[str, set[str]]:
    """兼容导出结构和内部 set 结构的权限 API 映射。"""
    mappings = permission_api_map.get("mappings", permission_api_map)
    normalized: dict[str, set[str]] = {}
    for permission, value in mappings.items():
        if isinstance(value, dict):
            apis = value.get("apis", [])
        else:
            apis = value
        normalized[permission] = {_strip_api_level(str(api)) for api in apis}
    return normalized


def _normalize_component_api_map(component_api_map: dict) -> dict[str, set[str]]:
    """兼容导出结构和内部 set 结构的组件 API 映射。"""
    mappings = component_api_map.get("mappings", component_api_map)
    normalized: dict[str, set[str]] = {}
    for component, value in mappings.items():
        if isinstance(value, dict):
            apis = value.get("apis", [])
        else:
            apis = value
        normalized[component] = {_strip_api_level(str(api)) for api in apis}
    return normalized


def _strip_api_level(api: str) -> str:
    """去掉 @apiN 后缀，便于不同数据源交集匹配。"""
    return api.rsplit("@api", 1)[0]
