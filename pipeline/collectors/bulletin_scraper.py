"""Android Security Bulletin scraper skeleton."""

from dataclasses import dataclass
from datetime import date


@dataclass
class Vulnerability:
    """Normalized vulnerability row from Android Security Bulletin."""

    cve_id: str
    bulletin_date: str
    severity: str
    type: str
    component: str
    component_category: str
    affected_versions: list[str]
    vendor: str
    bulletin_url: str
    raw_row: dict


class BulletinScraper:
    """Scrape monthly Android Security Bulletin pages."""

    BASE_URL = "https://source.android.com/docs/security/bulletin"

    def list_bulletins_in_range(self, start: date, end: date) -> list[date]:
        """列出范围内所有公告月份。"""
        raise NotImplementedError("TODO: implement in week 1/2")

    def scrape_month(self, bulletin_date: date) -> list[Vulnerability]:
        """抓取并解析单月公告。"""
        raise NotImplementedError("TODO: implement in week 1/2")

    def _fetch(self, url: str) -> str:
        """Fetch bulletin HTML for a single URL."""
        raise NotImplementedError("TODO: implement in week 1/2")

    def _parse(self, html: str, bulletin_date: date) -> list[Vulnerability]:
        """解析 HTML,提取所有 CVE 表格。"""
        raise NotImplementedError("TODO: implement in week 1/2")

    def _normalize_component(self, raw_component: str) -> str:
        """组件名归一化到 5 大类。"""
        raise NotImplementedError("TODO: implement in week 1/2")


class HeaderMatcher:
    """Identify semantic columns from historically changing bulletin headers."""

    @staticmethod
    def identify_columns(headers: list[str]) -> dict[str, int]:
        """根据表头文本识别每一列的语义。"""
        raise NotImplementedError("TODO: implement in week 1/2")
