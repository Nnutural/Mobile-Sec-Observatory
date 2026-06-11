import pytest


@pytest.mark.skip(reason="implementation pending")
@pytest.mark.parametrize(
    ("headers", "expected_columns"),
    [
        (
            ["CVE", "References", "Type", "Severity", "Updated AOSP versions"],
            {"cve": 0, "type": 2, "severity": 3},
        ),
    ],
)
def test_header_matcher_identifies_shifted_columns(
    headers: list[str],
    expected_columns: dict[str, int],
) -> None:
    """占位验证 Bulletin 表头变化时的启发式列识别。"""
    assert headers[0] == "CVE"
    assert expected_columns["severity"] == 3
