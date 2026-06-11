"""Data quality validation skeleton."""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ValidationReport:
    """Placeholder validation report container."""

    passed: bool = True
    messages: list[str] = field(default_factory=list)


class DataQualityValidator:
    """对生成的 JSON 进行 Schema 校验与统计一致性校验。"""

    def validate_all(self, data_dir: Path) -> ValidationReport:
        """Validate schema, referential integrity, and statistical consistency."""
        raise NotImplementedError("TODO: implement in week 1/2")

    def _validate_schema(self, data_dir: Path) -> ValidationReport:
        """Validate all JSON files against their schemas."""
        raise NotImplementedError("TODO: implement in week 1/2")

    def _validate_referential_integrity(self, data_dir: Path) -> ValidationReport:
        """检查跨文件引用完整性。"""
        raise NotImplementedError("TODO: implement in week 1/2")

    def _validate_statistical_consistency(self, data_dir: Path) -> ValidationReport:
        """统计一致性。"""
        raise NotImplementedError("TODO: implement in week 1/2")
