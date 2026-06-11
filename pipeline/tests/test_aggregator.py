from pipeline.collectors.bulletin_scraper import Vulnerability
from pipeline.metrics.aggregator import StatisticsAggregator
from pipeline.metrics.clri_calculator import CLRIResult
from pipeline.tests.test_pdi import _apk


def test_overview_counts_match_input() -> None:
    apps = [{"id": "app", "category_id": "Development"}]
    analyses = [_apk(package="app", all_permissions=["android.permission.CAMERA"], dangerous=["android.permission.CAMERA"])]
    vulns = [Vulnerability("CVE-1", "2026-01-01", "High", "EoP", "Framework", "Framework", ["14"], "AOSP", "url", {})]
    clri = [CLRIResult("app", 10, [], [], {})]
    stats = StatisticsAggregator().aggregate_dashboard_stats(apps, analyses, vulns, clri, apps_with_drift_count=1)
    assert stats["overview"]["total_apps"] == 1
    assert stats["overview"]["total_apk_versions"] == 1
    assert stats["overview"]["total_cves"] == 1
    assert stats["overview"]["apps_with_drift_count"] == 1


def test_monthly_trend_sorted() -> None:
    vulns = [
        Vulnerability("CVE-2", "2026-02-01", "Low", "DoS", "System", "System", [], "AOSP", "url", {}),
        Vulnerability("CVE-1", "2026-01-01", "High", "EoP", "Framework", "Framework", [], "AOSP", "url", {}),
    ]
    trend = StatisticsAggregator()._monthly_trend(vulns)
    assert [item["month"] for item in trend] == ["2026-01", "2026-02"]
