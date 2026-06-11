import json

from pipeline.exporters.json_exporter import JSONExporter


def test_writes_utf8_no_ascii_escape(tmp_path) -> None:
    path = tmp_path / "one.json"
    JSONExporter().export_json(path, {"name": "中文"})
    text = path.read_text(encoding="utf-8")
    assert "中文" in text
    assert "\\u4e2d" not in text


def test_adds_missing_schema_fields(tmp_path) -> None:
    path = tmp_path / "one.json"
    JSONExporter().export_json(path, {"name": "x"})
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["schema_version"] == "1.0"
    assert isinstance(payload["generated_at"], str)
