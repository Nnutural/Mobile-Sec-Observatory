from __future__ import annotations

import json

import responses

from pipeline.collectors import fdroid_collector
from pipeline.collectors.fdroid_collector import FDroidApp, FDroidCollector, FDroidVersion
from pipeline.tests.conftest import ONLINE_FIXTURE_DIR


def test_real_index_parses_filter_picks_30_apps(tmp_path, monkeypatch, online_responses) -> None:
    monkeypatch.setattr(fdroid_collector, "MIN_INTERVAL_SECONDS", 0)
    collector = FDroidCollector(cache_dir=tmp_path / "fdroid")

    apps = collector.filter_apps(
        categories=["Internet", "Multimedia"],
        min_versions=1,
        min_target_sdk=0,
        per_category_count=30,
    )

    assert apps
    assert len(apps) <= 30
    assert all(app.versions for app in apps)
    assert all(version.sha256 is not None for app in apps for version in app.versions)


def test_real_index_handles_missing_categories(tmp_path, monkeypatch, online_responses) -> None:
    monkeypatch.setattr(fdroid_collector, "MIN_INTERVAL_SECONDS", 0)
    index = json.loads((ONLINE_FIXTURE_DIR / "fdroid_index_v2_real.json").read_text(encoding="utf-8"))
    first_package = next(iter(index["packages"].values()))
    first_package["metadata"].pop("categories", None)
    second_package = list(index["packages"].values())[1]
    second_package["metadata"]["categories"] = []
    online_responses.replace(
        responses.GET,
        FDroidCollector.INDEX_URL,
        json=index,
        status=200,
    )

    collector = FDroidCollector(cache_dir=tmp_path / "fdroid")

    apps = collector.filter_apps(categories=["Internet"], min_versions=1, min_target_sdk=0, per_category_count=3)

    assert isinstance(apps, list)


def test_real_index_handles_missing_sha256(tmp_path, monkeypatch, online_responses) -> None:
    monkeypatch.setattr(fdroid_collector, "MIN_INTERVAL_SECONDS", 0)
    body = b"fake-apk"
    index = json.loads((ONLINE_FIXTURE_DIR / "fdroid_index_v2_real.json").read_text(encoding="utf-8"))
    package_name = "org.example.missing.sha"
    index["packages"] = {
        package_name: {
            "metadata": {"name": "Missing Sha", "categories": ["Internet"]},
            "versions": {
                "1": {
                    "versionCode": 1,
                    "versionName": "1.0",
                    "added": 1710000000000,
                    "file": {"name": "missing-sha.apk", "size": len(body)},
                    "manifest": {"usesSdk": {"targetSdkVersion": 33, "minSdkVersion": 23}},
                }
            },
        }
    }
    online_responses.replace(responses.GET, FDroidCollector.INDEX_URL, json=index, status=200)
    online_responses.add(responses.GET, f"{FDroidCollector.REPO_BASE}/missing-sha.apk", body=body, status=200)

    collector = FDroidCollector(cache_dir=tmp_path / "fdroid")
    app = FDroidApp(package_name, "Missing Sha", "Internet", "", None, [])
    version = FDroidVersion("1.0", 1, "missing-sha.apk", "2024-03-09", len(body), 33, 23)

    apk_path = collector.download_apk(app, version)

    assert apk_path.read_bytes() == body
