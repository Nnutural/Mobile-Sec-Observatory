import json
from pathlib import Path

import pytest

from pipeline.collectors.fdroid_collector import FDroidCollector


def test_filter_by_category_count(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MSO_OFFLINE", "1")
    collector = FDroidCollector(cache_dir=tmp_path / "fdroid")
    apps = collector.filter_apps(["Development", "Internet"], per_category_count=2)
    assert len(apps) == 4
    assert [app.category for app in apps].count("Development") == 2
    assert [app.category for app in apps].count("Internet") == 2


def test_pick_latest_3_consecutive_versions_sorted(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MSO_OFFLINE", "1")
    collector = FDroidCollector(cache_dir=tmp_path / "fdroid")
    app = collector.filter_apps(["Development"], per_category_count=1)[0]
    assert [version.version_code for version in app.versions] == [1, 2, 3]
    assert [version.release_date for version in app.versions] == sorted(version.release_date for version in app.versions)


def test_cache_hit_skips_http(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MSO_OFFLINE", raising=False)
    cache_dir = tmp_path / "fdroid"
    cache_dir.mkdir()
    expected = {"packages": {}}
    (cache_dir / "index-v2.json").write_text(json.dumps(expected), encoding="utf-8")

    def fail_get(*args: object, **kwargs: object) -> None:
        raise AssertionError("requests.get should not be called on fresh cache")

    monkeypatch.setattr("pipeline.collectors.fdroid_collector.requests.get", fail_get)
    assert FDroidCollector(cache_dir=cache_dir).fetch_index() == expected
