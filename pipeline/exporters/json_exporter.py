"""JSON export skeleton for web/public/data artifacts."""

from pathlib import Path


class JSONExporter:
    """Export normalized pipeline outputs to static frontend JSON files."""

    def export_all(self, output_dir: Path, payloads: dict[str, dict]) -> None:
        """Export all frontend JSON payloads into output_dir."""
        raise NotImplementedError("TODO: implement in week 1/2")

    def export_json(self, output_path: Path, payload: dict) -> None:
        """Export one JSON payload to disk."""
        raise NotImplementedError("TODO: implement in week 1/2")
