from pipeline.collectors.bulletin_scraper import Vulnerability
from pipeline.metrics.clri_calculator import CLRICalculator


def _vuln(cve: str, severity: str = "High", category: str = "Framework") -> Vulnerability:
    return Vulnerability(cve, "2026-01-01", severity, "EoP", category, category, ["14"], "AOSP", "https://example.org", {})


def test_rho_zero_half_and_one() -> None:
    calc = CLRICalculator(
        {"p0": {"a"}, "p_half": {"a", "b"}, "p_one": {"a"}},
        [_vuln("CVE-1")],
        {},
        {"Framework": {"a"}},
    )
    assert calc.compute_rho("missing", "CVE-1") == 0
    assert calc.compute_rho("p_half", "CVE-1") == 0.5
    assert calc.compute_rho("p_one", "CVE-1") == 1.0


def test_multi_cve_accumulates_correctly() -> None:
    calc = CLRICalculator({"p": {"a"}}, [_vuln("CVE-1", "High"), _vuln("CVE-2", "Low")], {"p": {"weight": 1}}, {"Framework": {"a"}})
    assert calc.compute_app_clri("app", ["p"]).clri == 4.0


def test_top_risk_permissions_sorted() -> None:
    calc = CLRICalculator({"p1": {"a"}, "p2": {"a"}}, [_vuln("CVE-1", "High")], {"p1": {"weight": 0.5}, "p2": {"weight": 1.0}}, {"Framework": {"a"}})
    result = calc.compute_app_clri("app", ["p1", "p2"])
    assert result.top_risk_permissions[0]["permission"] == "p2"


def test_top_associated_cves_sorted_and_limited() -> None:
    vulns = [_vuln(f"CVE-{idx}", "High") for idx in range(12)]
    calc = CLRICalculator({"p": {"a"}}, vulns, {"p": {"weight": 1}}, {"Framework": {"a"}})
    result = calc.compute_app_clri("app", ["p"])
    assert len(result.top_associated_cves) == 10
    assert result.top_associated_cves[0]["contribution"] == 3.0


def test_component_breakdown_sum_matches_clri() -> None:
    calc = CLRICalculator({"p": {"a"}}, [_vuln("CVE-1", "High"), _vuln("CVE-2", "Low", "Media")], {"p": {"weight": 1}}, {"Framework": {"a"}, "Media": {"a"}})
    result = calc.compute_app_clri("app", ["p"])
    assert abs(sum(result.component_breakdown.values()) - result.clri) < 1e-2


def test_empty_permissions_returns_zero() -> None:
    calc = CLRICalculator({"p": {"a"}}, [_vuln("CVE-1")], {"p": {"weight": 1}}, {"Framework": {"a"}})
    result = calc.compute_app_clri("app", [])
    assert result.clri == 0
    assert result.top_risk_permissions == []
    assert result.top_associated_cves == []
