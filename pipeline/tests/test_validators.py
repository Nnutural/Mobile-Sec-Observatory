import json

from pipeline.exporters.json_exporter import JSONExporter
from pipeline.quality.validators import DataQualityValidator


def _payloads(edge_target: str = "CVE-1") -> dict[str, dict]:
    return {
        "apps": {"source": "F-Droid", "fdroid_index_date": "2026-01-01", "total_count": 1, "apps": [{"id": "app", "name": "App", "category_id": "Development", "category_zh": "开发", "versions": ["1", "2"], "latest_version": "2"}]},
        "app_versions": {"total_count": 2, "versions": [{"app_id": "app", "version_name": "1", "version_code": 1, "permissions": {}, "components": {}, "flags": {}}, {"app_id": "app", "version_name": "2", "version_code": 2, "permissions": {}, "components": {}, "flags": {}}]},
        "permissions_metadata": {"source": "AOSP", "permissions": {}, "groups": {}},
        "pdi_results": {"weights": {"alpha": 0.3, "beta": 0.4, "gamma": 0.2, "delta": 0.1}, "summary_stats": {}, "results": [{"app_id": "app", "app_name": "App", "cumulative_pdi": 0.5, "drift_sequence": [{"from_version": "1", "to_version": "2", "components": {"delta_d": 1, "delta_s": 0, "delta_c": 1, "delta_e": 0}, "pdi": 0.5}]}]},
        "vulnerabilities": {"time_range": {"start": "2026-01", "end": "2026-01"}, "total_count": 1, "vulnerabilities": [{"cve_id": "CVE-1", "bulletin_date": "2026-01-01", "severity": "High", "type": "EoP", "component": "Framework", "component_category": "Framework", "affected_versions": ["14"], "vendor": "AOSP", "bulletin_url": "url"}]},
        "clri_matrix": {"total_apps": 1, "total_cves_considered": 1, "app_scores": [{"app_id": "app", "app_name": "App", "category": "Development", "clri": 1, "rank": 1, "top_risk_permissions": [], "top_associated_cves": [], "component_breakdown": {}}], "permission_vuln_edges": [{"source": "p", "target": edge_target, "weight": 1, "rho": 1}]},
        "comparison": {"data_collection_date": "2026-01-01", "dimensions": [], "flow_diagrams": {}, "advantages_disadvantages": {}, "recommendations": []},
        "dashboard_stats": {"overview": {"total_apps": 1, "total_apk_versions": 2, "total_cves": 1, "bulletin_months": 1, "avg_dangerous_permissions": 0, "avg_clri": 1, "high_risk_apps_count": 0, "apps_with_drift_count": 1}, "vuln_monthly_trend": [], "permission_category_distribution": []},
        "permission_api_map": {"sources": ["PScout", "Axplorer", "Android Official Docs"], "coverage": {}, "mappings": {}},
        "component_api_map": {"mappings": {"Framework": {"apis": [], "typical_files": []}}},
    }


def test_referential_integrity_detects_dangling_cve(tmp_path) -> None:
    JSONExporter().export_all(tmp_path, _payloads(edge_target="CVE-MISSING"))
    report = DataQualityValidator().validate_all(tmp_path)
    assert not report.passed
    assert "permission_vuln_edges target dangling" in report.to_text()


def test_pdi_consistency_check_passes_on_generated(tmp_path) -> None:
    JSONExporter().export_all(tmp_path, _payloads())
    report = DataQualityValidator().validate_all(tmp_path)
    assert report.passed, report.to_text()
