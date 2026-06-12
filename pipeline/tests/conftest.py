from __future__ import annotations

from pathlib import Path

import pytest
import responses

from pipeline.collectors.bulletin_scraper import BulletinScraper
from pipeline.collectors.fdroid_collector import FDroidCollector


ONLINE_FIXTURE_DIR = Path(__file__).parent / "fixtures" / "online"


@pytest.fixture
def online_responses():
    """Register recorded real HTTP responses for online-path tests."""
    with responses.RequestsMock(assert_all_requests_are_fired=False) as registry:
        registry.add(
            responses.GET,
            FDroidCollector.INDEX_URL,
            body=(ONLINE_FIXTURE_DIR / "fdroid_index_v2_real.json").read_text(encoding="utf-8"),
            content_type="application/json",
            status=200,
        )
        scraper = BulletinScraper()
        for month in ["2026_04", "2026_05"]:
            year, raw_month = month.split("_", 1)
            registry.add(
                responses.GET,
                f"{scraper.BASE_URL}/{year}/{year}-{raw_month}-01",
                body=(ONLINE_FIXTURE_DIR / f"bulletin_{month}.html").read_text(encoding="utf-8"),
                content_type="text/html; charset=utf-8",
                status=200,
            )
        yield registry
