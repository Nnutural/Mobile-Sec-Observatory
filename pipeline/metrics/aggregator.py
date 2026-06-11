"""Aggregate statistics for dashboard JSON."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone

from pipeline.analyzers.apk_analyzer import APKAnalysisResult
from pipeline.collectors.bulletin_scraper import Vulnerability
from pipeline.collectors.fdroid_collector import FDroidApp
from pipeline.metrics.clri_calculator import CLRIResult


class StatisticsAggregator:
    """生成前端 Dashboard 所需的聚合统计。"""

    CATEGORIES = ["Development", "Internet", "Multimedia", "Navigation", "Reading"]

    def aggregate_dashboard_stats(
        self,
        apps: list[FDroidApp],
        analyses: list[APKAnalysisResult],
        vulns: list[Vulnerability],
        clri_results: list[CLRIResult],
        apps_with_drift_count: int | None = None,
    ) -> dict:
        """聚合 Dashboard 统计；未传 drift 数量时按 0 处理。"""
        category_distribution = self._permission_category_distribution(apps, analyses)
        return {
            "schema_version": "1.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "overview": {
                "total_apps": len(apps),
                "total_apk_versions": len(analyses),
                "total_cves": len(vulns),
                "bulletin_months": len({vuln.bulletin_date[:7] for vuln in vulns}),
                "avg_dangerous_permissions": self._avg_dangerous(analyses),
                "avg_clri": self._avg_clri(clri_results),
                "high_risk_apps_count": sum(1 for result in clri_results if result.clri > 50),
                "apps_with_drift_count": 0 if apps_with_drift_count is None else apps_with_drift_count,
            },
            "vuln_monthly_trend": self._monthly_trend(vulns),
            "permission_category_distribution": category_distribution,
        }

    def _avg_dangerous(self, analyses: list[APKAnalysisResult]) -> float:
        """计算平均危险权限数。"""
        if not analyses:
            return 0.0
        return round(sum(len(item.permissions_dangerous) for item in analyses) / len(analyses), 2)

    def _avg_clri(self, clri_results: list[CLRIResult]) -> float:
        """计算平均 CLRI。"""
        if not clri_results:
            return 0.0
        return round(sum(item.clri for item in clri_results) / len(clri_results), 2)

    def _severity_dist(self, vulns: list[Vulnerability]) -> dict:
        """计算漏洞严重等级分布。"""
        return dict(Counter(vuln.severity for vuln in vulns))

    def _component_dist(self, vulns: list[Vulnerability]) -> dict:
        """计算漏洞组件类别分布。"""
        return dict(Counter(vuln.component_category for vuln in vulns))

    def _monthly_trend(self, vulns: list[Vulnerability]) -> list[dict]:
        """按月份升序计算漏洞趋势。"""
        months: dict[str, Counter] = defaultdict(Counter)
        for vuln in vulns:
            months[vuln.bulletin_date[:7]][vuln.severity.lower()] += 1
        return [
            {
                "month": month,
                "critical": months[month].get("critical", 0),
                "high": months[month].get("high", 0),
                "moderate": months[month].get("moderate", 0),
                "low": months[month].get("low", 0),
            }
            for month in sorted(months)
        ]

    def _permission_category_distribution(self, apps: list[FDroidApp], analyses: list[APKAnalysisResult]) -> list[dict]:
        """计算类别权限分布。"""
        app_category = {_app_id(app): _app_category(app) for app in apps}
        category_permissions: dict[str, set[str]] = {category: set() for category in self.CATEGORIES}
        category_dangerous_counts: dict[str, list[int]] = {category: [] for category in self.CATEGORIES}
        for analysis in analyses:
            category = app_category.get(analysis.package_name, "Development")
            category_permissions.setdefault(category, set()).update(analysis.permissions_all)
            category_dangerous_counts.setdefault(category, []).append(len(analysis.permissions_dangerous))
        return [
            {
                "category": category,
                "permission_count": len(category_permissions.get(category, set())),
                "avg_dangerous": round(
                    sum(category_dangerous_counts.get(category, [])) / len(category_dangerous_counts.get(category, [])),
                    2,
                )
                if category_dangerous_counts.get(category)
                else 0.0,
            }
            for category in self.CATEGORIES
        ]


def _app_id(app: FDroidApp | dict) -> str:
    """读取 app id。"""
    if isinstance(app, dict):
        return str(app.get("id") or app.get("package_name"))
    return app.package_name


def _app_category(app: FDroidApp | dict) -> str:
    """读取 app category。"""
    if isinstance(app, dict):
        return str(app.get("category_id") or app.get("category") or "Development")
    return app.category
