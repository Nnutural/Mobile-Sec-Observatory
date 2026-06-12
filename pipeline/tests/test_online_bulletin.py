from __future__ import annotations

from datetime import date

from pipeline.collectors import bulletin_scraper
from pipeline.collectors.bulletin_scraper import BulletinScraper


VALID_SEVERITIES = {"Critical", "High", "Moderate", "Low"}


def test_real_2026_04_parses(monkeypatch, online_responses) -> None:
    monkeypatch.setattr(bulletin_scraper, "MIN_INTERVAL_SECONDS", 0)

    vulnerabilities = BulletinScraper().scrape_month(date(2026, 4, 1))

    assert len(vulnerabilities) >= 1
    assert {item.severity for item in vulnerabilities} <= VALID_SEVERITIES


def test_real_2026_05_parses(monkeypatch, online_responses) -> None:
    monkeypatch.setattr(bulletin_scraper, "MIN_INTERVAL_SECONDS", 0)

    vulnerabilities = BulletinScraper().scrape_month(date(2026, 5, 1))

    assert len(vulnerabilities) >= 1
    assert {item.severity for item in vulnerabilities} <= VALID_SEVERITIES


def test_unicode_in_component_names() -> None:
    html = """
    <html><body>
      <h2>Framework — Unicode 组件</h2>
      <table>
        <tr><th>CVE</th><th>Severity</th><th>Subcomponent</th><th>Type</th><th>Updated AOSP versions</th></tr>
        <tr><td>CVE-2026-0001</td><td>High</td><td>Media — 子系统</td><td>EoP</td><td>14, 15</td></tr>
      </table>
    </body></html>
    """

    vulnerabilities = BulletinScraper()._parse(html, date(2026, 4, 1))

    assert vulnerabilities[0].component == "Media — 子系统"
    assert vulnerabilities[0].severity == "High"


def test_table_with_no_cve_column_skipped() -> None:
    html = """
    <html><body>
      <h2>Notes</h2>
      <table>
        <tr><th>Updated Google services versions</th><th>Notes</th></tr>
        <tr><td>2026-04</td><td>No vulnerability rows here.</td></tr>
      </table>
    </body></html>
    """

    vulnerabilities = BulletinScraper()._parse(html, date(2026, 4, 1))

    assert vulnerabilities == []
