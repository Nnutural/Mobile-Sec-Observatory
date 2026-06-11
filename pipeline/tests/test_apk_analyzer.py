from pathlib import Path

from pipeline.analyzers.apk_analyzer import APKAnalyzer


def _metadata() -> dict:
    import json

    return json.loads((Path(__file__).parents[1] / "data" / "permissions_metadata.json").read_text(encoding="utf-8"))


def test_manifest_only_mode_extracts_permissions() -> None:
    analyzer = APKAnalyzer(_metadata())
    path = Path(__file__).parent / "fixtures" / "manifests" / "org.mso.demo__2.manifest.xml"
    result = analyzer.analyze(path)
    assert result.package_name == "org.mso.demo"
    assert result.version_code == 2
    assert "android.permission.ACCESS_FINE_LOCATION" in result.permissions_dangerous
    assert "android.permission.INTERNET" in result.permissions_normal
    assert result.network_security_config is True


def test_categorize_with_unknown_permission() -> None:
    analyzer = APKAnalyzer(_metadata())
    dangerous, normal, signature, unknown = analyzer._categorize(
        ["android.permission.CAMERA", "android.permission.INTERNET", "android.permission.UNKNOWN_X"]
    )
    assert dangerous == ["android.permission.CAMERA"]
    assert normal == ["android.permission.INTERNET"]
    assert signature == []
    assert unknown == ["android.permission.UNKNOWN_X"]


def test_exported_components_only_explicit() -> None:
    analyzer = APKAnalyzer(_metadata())
    path = Path(__file__).parent / "fixtures" / "manifests" / "io.mso.reader__1.manifest.xml"
    result = analyzer.analyze(path)
    assert result.receivers_total == 1
    assert result.receivers_exported == 0
    assert result.activities_exported == 1
