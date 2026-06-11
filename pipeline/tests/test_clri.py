import pytest


@pytest.mark.skip(reason="implementation pending")
@pytest.mark.parametrize(
    ("permission", "cve_id", "expected_rho"),
    [
        (
            "android.permission.ACCESS_FINE_LOCATION",
            "CVE-2026-0003",
            0.4,
        ),
    ],
)
def test_case_2_permission_cve_rho_placeholder(
    permission: str,
    cve_id: str,
    expected_rho: float,
) -> None:
    """占位验证权限-CVE 关联强度计算接口。"""
    assert permission.startswith("android.permission.")
    assert cve_id.startswith("CVE-")
    assert expected_rho >= 0.0
