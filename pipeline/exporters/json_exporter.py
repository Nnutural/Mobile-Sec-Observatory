"""JSON exporter for web/public/data artifacts."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import json


class JSONExporter:
    """Export normalized pipeline outputs to static frontend JSON files."""

    REQUIRED_NAMES = {
        "apps",
        "app_versions",
        "permissions_metadata",
        "pdi_results",
        "vulnerabilities",
        "clri_matrix",
        "comparison",
        "dashboard_stats",
        "permission_api_map",
        "component_api_map",
    }

    def export_all(self, output_dir: Path, payloads: dict[str, dict]) -> None:
        """导出全部 10 份前端 JSON。"""
        missing = self.REQUIRED_NAMES - set(payloads)
        if missing:
            raise ValueError(f"missing payloads: {sorted(missing)}")
        output_dir.mkdir(parents=True, exist_ok=True)
        for name in sorted(self.REQUIRED_NAMES):
            self.export_json(output_dir / f"{name}.json", payloads[name])

    def export_json(self, output_path: Path, payload: dict) -> None:
        """原子写入单个 JSON 文件。"""
        payload = dict(payload)
        payload.setdefault("schema_version", "1.0")
        payload.setdefault("generated_at", datetime.now(timezone.utc).isoformat())
        output_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = output_path.with_suffix(output_path.suffix + ".tmp")
        tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp_path.replace(output_path)
