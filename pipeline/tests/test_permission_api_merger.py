from pipeline.collectors.comparison_extractor import PermissionAPIMerger


def test_priority_official_over_axplorer_over_pscout() -> None:
    merger = PermissionAPIMerger()
    merged = merger.merge_sources(
        {"android.permission.CAMERA": ["Camera.open@api1", "LegacyCamera@api1"]},
        {"android.permission.CAMERA": ["Camera.open@api1", "Camera2.open@api21"]},
        {"android.permission.CAMERA": ["Camera.open@api1", "CameraX.takePicture@api21"]},
    )
    assert merged["android.permission.CAMERA"] == {
        "Camera.open@api1",
        "LegacyCamera@api1",
        "Camera2.open@api21",
        "CameraX.takePicture@api21",
    }
    assert merger.as_export_dict()["mappings"]["android.permission.CAMERA"]["source"] == "Android Official Docs"


def test_as_export_dict_shape_matches_schema() -> None:
    merger = PermissionAPIMerger()
    merger.merge_sources({}, {}, {"android.permission.INTERNET": ["Socket.connect@api1"]})
    exported = merger.as_export_dict()
    assert exported["schema_version"] == "1.0"
    assert exported["sources"] == ["PScout", "Axplorer", "Android Official Docs"]
    assert exported["coverage"]["1"]["mapped_apis"] == 1
    assert exported["mappings"]["android.permission.INTERNET"]["api_count"] == 1
