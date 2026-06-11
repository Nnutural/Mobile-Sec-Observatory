"""Comparison source extraction and permission API merger."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Iterable

import yaml


class ComparisonExtractor:
    """Validate and transform manually curated Android/OpenHarmony comparison data."""

    def load_raw(self, path: Path) -> dict:
        """读取并校验原始对比 YAML。"""
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if not isinstance(raw.get("dimensions"), list):
            raise ValueError("comparison raw schema must contain dimensions list")
        return raw

    def extract_dimensions(self, raw_data: dict) -> list[dict]:
        """归一化系统对比维度。"""
        dimensions: list[dict] = []
        for item in raw_data.get("dimensions", []):
            dimension_id = item.get("id", "<unknown>")
            dimensions.append(
                {
                    "id": self._require(item, "id", dimension_id),
                    "name_zh": self._require(item, "name_zh", dimension_id),
                    "description_zh": self._require(item, "description_zh", dimension_id),
                    "android": {
                        "mechanism": self._require_nested(item, "android", "mechanism", dimension_id),
                        "details": self._require_nested(item, "android", "details", dimension_id),
                        "source_url": self._require_nested(item, "android", "source_url", dimension_id),
                    },
                    "openharmony": {
                        "mechanism": self._require_nested(item, "openharmony", "mechanism", dimension_id),
                        "details": self._require_nested(item, "openharmony", "details", dimension_id),
                        "source_url": self._require_nested(item, "openharmony", "source_url", dimension_id),
                    },
                    "advantage": self._validate_advantage(self._require(item, "advantage", dimension_id), dimension_id),
                    "advantage_reason": self._require(item, "advantage_reason", dimension_id),
                }
            )
        return dimensions

    @staticmethod
    def _require(item: dict, field: str, dimension_id: str) -> str:
        """读取必填字段。"""
        value = item.get(field)
        if value in (None, ""):
            raise ValueError(f"dimension {dimension_id} missing {field}")
        return str(value)

    @staticmethod
    def _require_nested(item: dict, section: str, field: str, dimension_id: str) -> str:
        """读取嵌套必填字段。"""
        section_data = item.get(section)
        if not isinstance(section_data, dict):
            raise ValueError(f"dimension {dimension_id} missing {section}")
        value = section_data.get(field)
        if value in (None, ""):
            raise ValueError(f"dimension {dimension_id} missing {section}.{field}")
        return str(value)

    @staticmethod
    def _validate_advantage(value: str, dimension_id: str) -> str:
        """校验优势枚举。"""
        if value not in {"android", "openharmony", "neutral"}:
            raise ValueError(f"dimension {dimension_id} missing valid advantage")
        return value


class PermissionAPIMerger:
    """Merge permission-API maps from PScout, Axplorer, and official documentation."""

    SOURCE_PRIORITY = {"PScout": 1, "Axplorer": 2, "Android Official Docs": 3}

    def __init__(self) -> None:
        """初始化合并器。"""
        self.mapping: dict[str, set[str]] = {}
        self._provenance: dict[str, dict[str, str]] = {}

    def merge_sources(
        self,
        pscout_data: dict,
        axplorer_data: dict,
        official_data: dict,
    ) -> dict[str, set[str]]:
        """合并三类权限-API 映射。"""
        self.mapping = {}
        self._provenance = {}
        for source_name, source_data in [
            ("PScout", pscout_data),
            ("Axplorer", axplorer_data),
            ("Android Official Docs", official_data),
        ]:
            for permission, apis in self._iter_mappings(source_data):
                self.mapping.setdefault(permission, set()).update(apis)
                provenance = self._provenance.setdefault(permission, {})
                for api in apis:
                    old_source = provenance.get(api)
                    if old_source is None or self.SOURCE_PRIORITY[source_name] >= self.SOURCE_PRIORITY[old_source]:
                        provenance[api] = source_name
        return self.mapping

    def as_export_dict(self) -> dict:
        """导出为前端 permission_api_map.json 结构。"""
        coverage: dict[str, dict[str, int]] = {}
        mappings: dict[str, dict] = {}
        for permission, apis in sorted(self.mapping.items()):
            api_list = sorted(apis)
            for api in api_list:
                bucket = _api_level_bucket(api)
                stats = coverage.setdefault(bucket, {"total_apis": 0, "mapped_apis": 0})
                stats["total_apis"] += 1
                stats["mapped_apis"] += 1
            mappings[permission] = {
                "apis": api_list,
                "api_count": len(api_list),
                "source": self._best_source(permission),
            }
        return {
            "schema_version": "1.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "sources": ["PScout", "Axplorer", "Android Official Docs"],
            "coverage": dict(sorted(coverage.items())),
            "mappings": mappings,
        }

    def _best_source(self, permission: str) -> str:
        """返回某权限最高优先级来源。"""
        sources = set(self._provenance.get(permission, {}).values())
        if not sources:
            return "PScout"
        return max(sources, key=lambda source: self.SOURCE_PRIORITY[source])

    @staticmethod
    def _iter_mappings(data: dict) -> Iterable[tuple[str, set[str]]]:
        """兼容多种 fixture 映射形态。"""
        mappings = data.get("mappings", data)
        for permission, value in mappings.items():
            if permission.startswith("_") or not permission.startswith("android.permission."):
                continue
            if isinstance(value, dict):
                apis = value.get("apis", [])
            else:
                apis = value
            yield permission, {str(api) for api in apis}


def _api_level_bucket(api_signature: str) -> str:
    """从 API 签名后缀解析 api level。"""
    match = re.search(r"@api(\d+)", api_signature)
    return match.group(1) if match else "unknown"
