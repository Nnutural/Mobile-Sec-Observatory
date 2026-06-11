import json
from pathlib import Path

import pytest

from pipeline.analyzers.apk_analyzer import APKAnalysisResult
from pipeline.metrics.pdi_calculator import PDICalculator


META = json.loads((Path(__file__).parents[1] / "data" / "permissions_metadata.json").read_text(encoding="utf-8"))


def _apk(
    package: str = "app",
    code: int = 1,
    all_permissions: list[str] | None = None,
    dangerous: list[str] | None = None,
    exported: tuple[int, int, int, int] = (0, 0, 0, 0),
) -> APKAnalysisResult:
    all_permissions = all_permissions or []
    dangerous = dangerous or []
    return APKAnalysisResult(
        package,
        str(code),
        code,
        "fixture",
        1,
        "sha",
        34,
        23,
        34,
        all_permissions,
        dangerous,
        [p for p in all_permissions if p not in dangerous],
        [],
        [],
        1,
        exported[0],
        1,
        exported[1],
        1,
        exported[2],
        1,
        exported[3],
        False,
        True,
        False,
        False,
        "manifest-only",
        "now",
    )


def test_case1_only_add_internet_zero_pdi() -> None:
    result = PDICalculator(META)._compute_pair(_apk(code=1), _apk(code=2, all_permissions=["android.permission.INTERNET"]))
    assert result.components.delta_d == 0
    assert result.components.delta_s == 0
    assert result.components.delta_c == 0
    assert result.components.delta_e == 0
    assert result.pdi == 0


def test_case2_same_group_silent_location_expansion() -> None:
    prev = _apk(code=1, all_permissions=["android.permission.ACCESS_COARSE_LOCATION"], dangerous=["android.permission.ACCESS_COARSE_LOCATION"])
    curr = _apk(code=2, all_permissions=["android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION"], dangerous=["android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION"])
    result = PDICalculator(META)._compute_pair(prev, curr)
    assert result.components.delta_s == 1
    assert result.details["silent_expansion_groups"] == ["LOCATION"]


def test_case3_new_camera_not_silent_group() -> None:
    result = PDICalculator(META)._compute_pair(_apk(code=1), _apk(code=2, all_permissions=["android.permission.CAMERA"], dangerous=["android.permission.CAMERA"]))
    assert result.components.delta_s == 0
    assert result.components.delta_d == 0.8


def test_case4_exported_components_increase() -> None:
    result = PDICalculator(META)._compute_pair(_apk(code=1, exported=(2, 1, 1, 1)), _apk(code=2, exported=(3, 2, 2, 1)))
    assert result.components.delta_e == 3


def test_case5_add_network_with_existing_dangerous_changes_combo() -> None:
    prev = _apk(code=1, all_permissions=["android.permission.CAMERA"], dangerous=["android.permission.CAMERA"])
    curr = _apk(code=2, all_permissions=["android.permission.CAMERA", "android.permission.INTERNET"], dangerous=["android.permission.CAMERA"])
    assert PDICalculator(META)._compute_pair(prev, curr).components.delta_c == 1


def test_case6_custom_alpha_only_returns_delta_d() -> None:
    calc = PDICalculator(META, {"alpha": 1, "beta": 0, "gamma": 0, "delta": 0})
    result = calc._compute_pair(_apk(code=1), _apk(code=2, all_permissions=["android.permission.CAMERA"], dangerous=["android.permission.CAMERA"]))
    assert result.pdi == 0.8


def test_case7_removed_permission_does_not_add_pdi() -> None:
    prev = _apk(code=1, all_permissions=["android.permission.CAMERA"], dangerous=["android.permission.CAMERA"])
    curr = _apk(code=2)
    result = PDICalculator(META)._compute_pair(prev, curr)
    assert result.pdi == 0
    assert result.details["removed_permissions"] == ["android.permission.CAMERA"]


def test_case8_missing_meta_dangerous_defaults_weight() -> None:
    prev = _apk(code=1)
    curr = _apk(code=2, all_permissions=["android.permission.UNKNOWN_DANGER"], dangerous=["android.permission.UNKNOWN_DANGER"])
    assert PDICalculator(META)._compute_pair(prev, curr).components.delta_d == 0.5


def test_case9_exported_components_decrease_can_make_negative_pdi() -> None:
    result = PDICalculator(META)._compute_pair(_apk(code=1, exported=(2, 2, 1, 0)), _apk(code=2, exported=(0, 1, 0, 0)))
    assert result.components.delta_e == -4
    assert result.pdi == -0.4


def test_case10_sequence_length_less_than_two_returns_empty() -> None:
    calc = PDICalculator(META)
    assert calc.compute_sequence([]) == []
    assert calc.compute_sequence([_apk()]) == []


def test_case11_package_mismatch_raises() -> None:
    with pytest.raises(ValueError):
        PDICalculator(META).compute_sequence([_apk(package="a", code=1), _apk(package="b", code=2)])
