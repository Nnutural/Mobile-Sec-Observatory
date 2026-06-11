from pathlib import Path

import pytest

from pipeline.collectors.comparison_extractor import ComparisonExtractor


def test_load_raw_valid() -> None:
    path = Path(__file__).parents[1] / "data" / "comparison_raw.yaml"
    raw = ComparisonExtractor().load_raw(path)
    assert "dimensions" in raw
    assert len(raw["dimensions"]) == 12


def test_extract_missing_field_raises() -> None:
    raw = {
        "dimensions": [
            {
                "id": "identity",
                "name_zh": "应用身份标识",
                "android": {"mechanism": "UID", "details": "details", "source_url": "https://example.org"},
                "openharmony": {"mechanism": "Token", "details": "details", "source_url": "https://example.org"},
                "advantage": "neutral",
                "advantage_reason": "reason",
            }
        ]
    }
    with pytest.raises(ValueError, match="description_zh"):
        ComparisonExtractor().extract_dimensions(raw)
