"""Android Security Bulletin scraper."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date
import html as html_lib
import logging
import re
import time

try:
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover - exercised only in minimal environments
    BeautifulSoup = None

try:
    import requests
except ImportError:  # pragma: no cover - exercised only in minimal environments
    class _MissingRequests:
        """Runtime shim used when requests is not installed."""

        RequestException = RuntimeError

        @staticmethod
        def get(*args: object, **kwargs: object) -> object:
            """Raise a clear error for online fetching without requests."""
            raise RuntimeError("requests is required for online bulletin fetching")

    requests = _MissingRequests()

logger = logging.getLogger(__name__)

USER_AGENT = "MobileSecObservatory/0.1 (research)"
SEVERITIES = {
    "critical": "Critical",
    "high": "High",
    "moderate": "Moderate",
    "mod": "Moderate",
    "low": "Low",
}


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
        """按月生成公告日期列表。"""
        if start > end:
            return []
        current = date(start.year, start.month, 1)
        final = date(end.year, end.month, 1)
        months: list[date] = []
        while current <= final:
            months.append(current)
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)
        return months

    def scrape_month(self, bulletin_date: date) -> list[Vulnerability]:
        """抓取并解析单月公告，失败时返回空列表。"""
        url = f"{self.BASE_URL}/{bulletin_date:%Y-%m-%d}"
        try:
            html = self._fetch(url)
            return self._parse(html, bulletin_date)
        except Exception as exc:
            logger.error("Failed to scrape bulletin %s: %s", bulletin_date.isoformat(), exc)
            return []

    def _fetch(self, url: str) -> str:
        """请求公告 HTML。"""
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
                if response.status_code == 429 or response.status_code >= 500:
                    raise RuntimeError(f"temporary HTTP {response.status_code}")
                if 400 <= response.status_code < 500:
                    raise RuntimeError(f"HTTP {response.status_code}")
                return response.text
            except (requests.RequestException, RuntimeError) as exc:
                last_error = exc
                if "HTTP 4" in str(exc):
                    raise
                logger.warning("Bulletin fetch retry %d/3 for %s: %s", attempt + 1, url, exc)
                time.sleep(2**attempt)
        raise RuntimeError(f"failed to fetch bulletin: {url}") from last_error

    def _parse(self, html: str, bulletin_date: date) -> list[Vulnerability]:
        """解析 HTML 并提取 CVE 表格。"""
        if BeautifulSoup is None:
            return self._parse_without_bs4(html, bulletin_date)

        soup = BeautifulSoup(html, "html.parser")
        vulnerabilities: list[Vulnerability] = []
        bulletin_url = f"{self.BASE_URL}/{bulletin_date:%Y-%m-%d}"

        for table in soup.find_all("table"):
            header_row = table.find("tr")
            if header_row is None:
                continue
            headers = [_clean_text(cell.get_text(" ")) for cell in header_row.find_all("th")]
            columns = HeaderMatcher.identify_columns(headers)
            if "cve" not in columns:
                continue

            section = table.find_previous(["h2", "h3"])
            section_title = _clean_text(section.get_text(" ")) if section else "System"
            body_rows = table.find_all("tr")[1:]
            for row in body_rows:
                cells = [_clean_text(cell.get_text(" ")) for cell in row.find_all(["td", "th"])]
                if not cells or columns["cve"] >= len(cells):
                    continue
                cve_id = cells[columns["cve"]]
                if "CVE-" not in cve_id:
                    continue

                raw_row = {
                    headers[i] if i < len(headers) else f"column_{i}": cells[i]
                    for i in range(min(len(headers), len(cells)))
                }
                component = self._cell(cells, columns.get("component")) or section_title
                vulnerabilities.append(
                    Vulnerability(
                        cve_id=_extract_cve(cve_id),
                        bulletin_date=bulletin_date.isoformat(),
                        severity=_normalize_severity(self._cell(cells, columns.get("severity"))),
                        type=self._cell(cells, columns.get("type")) or "N/A",
                        component=component,
                        component_category=self._normalize_component(component or section_title),
                        affected_versions=_split_versions(self._cell(cells, columns.get("affected"))),
                        vendor=_infer_vendor(section_title),
                        bulletin_url=bulletin_url,
                        raw_row=raw_row,
                    )
                )
        return vulnerabilities

    def _parse_without_bs4(self, html: str, bulletin_date: date) -> list[Vulnerability]:
        """在未安装 BeautifulSoup 时解析精简 HTML fixture。"""
        vulnerabilities: list[Vulnerability] = []
        bulletin_url = f"{self.BASE_URL}/{bulletin_date:%Y-%m-%d}"
        table_pattern = re.compile(r"<table\b[^>]*>(.*?)</table>", flags=re.IGNORECASE | re.DOTALL)
        heading_pattern = re.compile(r"<h[23]\b[^>]*>(.*?)</h[23]>", flags=re.IGNORECASE | re.DOTALL)
        headings = [(match.start(), _strip_tags(match.group(1))) for match in heading_pattern.finditer(html)]

        for table_match in table_pattern.finditer(html):
            section_title = "System"
            for heading_start, heading_text in headings:
                if heading_start < table_match.start():
                    section_title = heading_text
                else:
                    break
            rows = re.findall(r"<tr\b[^>]*>(.*?)</tr>", table_match.group(1), flags=re.IGNORECASE | re.DOTALL)
            if not rows:
                continue
            headers = [_strip_tags(cell) for cell in re.findall(r"<th\b[^>]*>(.*?)</th>", rows[0], flags=re.IGNORECASE | re.DOTALL)]
            columns = HeaderMatcher.identify_columns(headers)
            if "cve" not in columns:
                continue
            for row in rows[1:]:
                cells = [
                    _strip_tags(cell)
                    for cell in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", row, flags=re.IGNORECASE | re.DOTALL)
                ]
                if not cells or columns["cve"] >= len(cells):
                    continue
                cve_id = cells[columns["cve"]]
                if "CVE-" not in cve_id:
                    continue
                raw_row = {
                    headers[i] if i < len(headers) else f"column_{i}": cells[i]
                    for i in range(min(len(headers), len(cells)))
                }
                component = self._cell(cells, columns.get("component")) or section_title
                vulnerabilities.append(
                    Vulnerability(
                        cve_id=_extract_cve(cve_id),
                        bulletin_date=bulletin_date.isoformat(),
                        severity=_normalize_severity(self._cell(cells, columns.get("severity"))),
                        type=self._cell(cells, columns.get("type")) or "N/A",
                        component=component,
                        component_category=self._normalize_component(component or section_title),
                        affected_versions=_split_versions(self._cell(cells, columns.get("affected"))),
                        vendor=_infer_vendor(section_title),
                        bulletin_url=bulletin_url,
                        raw_row=raw_row,
                    )
                )
        return vulnerabilities

    def _normalize_component(self, raw_component: str) -> str:
        """将组件名归一到 Framework/System/Media/Kernel/Vendor。"""
        raw = raw_component.strip()
        rules = [
            (r"^Framework", "Framework"),
            (r"^Media\s*[Ff]ramework|^Media|Codec|Stagefright", "Media"),
            (r"^System|System UI|Bluetooth|Telephony", "System"),
            (r"^Kernel|.*kernel|BPF|Binder Driver", "Kernel"),
            (r"^Qualcomm|^Mediatek|^MediaTek|^Arm|^Imagination|Mali|Vendor", "Vendor"),
        ]
        for pattern, category in rules:
            if re.search(pattern, raw, flags=re.IGNORECASE):
                return category
        return "System"

    @staticmethod
    def _cell(cells: list[str], index: int | None) -> str:
        """按列号安全取单元格。"""
        if index is None or index >= len(cells):
            return ""
        return cells[index]


class HeaderMatcher:
    """Identify semantic columns from historically changing bulletin headers."""

    @staticmethod
    def identify_columns(headers: list[str]) -> dict[str, int]:
        """根据表头文本识别语义列。"""
        normalized = [_normalize_header(header) for header in headers]
        column_map: dict[str, int] = {}

        for idx, header in enumerate(normalized):
            if "cve" in header and "cve" not in column_map:
                column_map["cve"] = idx
            elif "type" in header and "type" not in column_map:
                column_map["type"] = idx
            elif "severity" in header and "severity" not in column_map:
                column_map["severity"] = idx

        for idx, header in enumerate(normalized):
            if "component" in column_map:
                break
            if "subcomp" in header:
                column_map["component"] = idx

        for idx, header in enumerate(normalized):
            if "component" in column_map:
                break
            if "component" in header:
                column_map["component"] = idx

        for idx, header in enumerate(normalized):
            if "affected" in header or "updated aosp versions" in header:
                column_map.setdefault("affected", idx)

        return column_map


def vulnerabilities_to_dicts(vulnerabilities: list[Vulnerability]) -> list[dict]:
    """把漏洞记录序列化为 JSON 友好的 dict。"""
    return [asdict(item) for item in vulnerabilities]


def _clean_text(text: str) -> str:
    """清理 HTML 单元格文本。"""
    return re.sub(r"\s+", " ", html_lib.unescape(text.replace("\xa0", " "))).strip()


def _strip_tags(fragment: str) -> str:
    """移除简短 HTML 片段中的标签。"""
    return _clean_text(re.sub(r"<[^>]+>", " ", fragment))


def _normalize_header(header: str) -> str:
    """规范化表头文本。"""
    return _clean_text(header).strip().lower()


def _normalize_severity(value: str) -> str:
    """规范化严重等级。"""
    key = value.strip().lower()
    if key in SEVERITIES:
        return SEVERITIES[key]
    if key.startswith("mod"):
        return "Moderate"
    return value.strip().title() if value.strip() else "Low"


def _split_versions(value: str) -> list[str]:
    """拆分受影响 Android 版本列表。"""
    if not value:
        return []
    return [part for part in re.split(r"[,\s]+", value.strip()) if part and part not in {"-", "—"}]


def _extract_cve(value: str) -> str:
    """从单元格中提取第一个 CVE 编号。"""
    match = re.search(r"CVE-\d{4}-\d{4,7}", value)
    return match.group(0) if match else value.strip()


def _infer_vendor(section_title: str) -> str:
    """从表格标题推断厂商。"""
    text = section_title.lower()
    vendors = {
        "qualcomm": "Qualcomm",
        "mediatek": "MediaTek",
        "arm": "Arm",
        "imagination": "Imagination",
        "kernel": "Kernel",
    }
    for needle, vendor in vendors.items():
        if needle in text:
            return vendor
    return "AOSP"
