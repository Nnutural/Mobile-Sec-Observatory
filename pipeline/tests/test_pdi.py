import pytest


@pytest.mark.skip(reason="implementation pending")
@pytest.mark.parametrize(
    ("prev_permissions", "curr_permissions", "expected_pdi"),
    [
        (
            [],
            ["android.permission.INTERNET"],
            0.0,
        ),
    ],
)
def test_case_1_internet_normal_permission_has_zero_pdi(
    prev_permissions: list[str],
    curr_permissions: list[str],
    expected_pdi: float,
) -> None:
    """应用 A 从 v1 到 v2 仅新增 INTERNET -> PDI=0."""
    assert prev_permissions == []
    assert curr_permissions == ["android.permission.INTERNET"]
    assert expected_pdi == 0.0
