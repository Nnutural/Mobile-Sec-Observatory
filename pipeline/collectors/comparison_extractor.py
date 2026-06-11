"""Comparison source extraction and permission API merger skeletons."""

from pathlib import Path


class ComparisonExtractor:
    """Validate and transform manually curated Android/OpenHarmony comparison data."""

    def load_raw(self, path: Path) -> dict:
        """Load raw comparison YAML."""
        raise NotImplementedError("TODO: implement in week 1/2")

    def extract_dimensions(self, raw_data: dict) -> list[dict]:
        """Extract normalized comparison dimensions from raw data."""
        raise NotImplementedError("TODO: implement in week 1/2")


class PermissionAPIMerger:
    """Merge permission-API maps from PScout, Axplorer, and official documentation."""

    def merge_sources(
        self,
        pscout_data: dict,
        axplorer_data: dict,
        official_data: dict,
    ) -> dict[str, set[str]]:
        """返回 {permission_name: set of API signatures}。"""
        raise NotImplementedError("TODO: implement in week 1/2")
