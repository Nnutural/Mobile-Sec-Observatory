from datetime import date
from pathlib import Path

from pipeline.collectors.bulletin_scraper import BulletinScraper, HeaderMatcher


FIXTURE_DIR = Path(__file__).parent / "fixtures" / "bulletin"


def test_identify_columns_standard() -> None:
    headers = ["CVE", "References", "Type", "Severity", "Updated AOSP versions"]
    assert HeaderMatcher.identify_columns(headers) == {
        "cve": 0,
        "type": 2,
        "severity": 3,
        "affected": 4,
    }


def test_identify_columns_type_before_severity() -> None:
    headers = ["CVE", "Type", "Severity", "Subcomponent", "Affected versions"]
    assert HeaderMatcher.identify_columns(headers) == {
        "cve": 0,
        "type": 1,
        "severity": 2,
        "component": 3,
        "affected": 4,
    }


def test_identify_columns_merged_affected_aosp() -> None:
    headers = ["CVE&nbsp;ID", "Component", "Severity", "Type", "Affected / Updated AOSP versions"]
    columns = HeaderMatcher.identify_columns(headers)
    assert columns["cve"] == 0
    assert columns["component"] == 1
    assert columns["affected"] == 4


def test_parse_empty_page_returns_nil() -> None:
    html = (FIXTURE_DIR / "bulletin_2025_09_empty.html").read_text(encoding="utf-8")
    assert BulletinScraper()._parse(html, date(2025, 9, 1)) == []


def test_normalize_component_kernel_and_vendor() -> None:
    scraper = BulletinScraper()
    assert scraper._normalize_component("Kernel") == "Kernel"
    assert scraper._normalize_component("Qualcomm closed-source components") == "Vendor"


def test_parse_standard_fixture() -> None:
    html = (FIXTURE_DIR / "bulletin_2024_06.html").read_text(encoding="utf-8")
    parsed = BulletinScraper()._parse(html, date(2024, 6, 1))
    assert len(parsed) == 1
    assert parsed[0].cve_id == "CVE-2024-1001"
    assert parsed[0].component_category == "Framework"
