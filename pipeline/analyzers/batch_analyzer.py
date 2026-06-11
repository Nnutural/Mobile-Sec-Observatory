"""Batch APK analysis."""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
import json
import logging

from pipeline.analyzers.apk_analyzer import APKAnalysisResult, APKAnalyzer

logger = logging.getLogger(__name__)


class BatchAPKAnalyzer:
    """Run APKAnalyzer over a directory of APK and manifest fixture files."""

    def __init__(self, analyzer: APKAnalyzer):
        """初始化批量 APK 分析器。"""
        self.analyzer = analyzer

    def analyze_dataset(
        self,
        apk_directory: Path,
        output_directory: Path,
        skip_existing: bool = True,
    ) -> list[APKAnalysisResult]:
        """批量分析 APK 与 manifest fixture，失败记录日志但不中断。"""
        output_directory.mkdir(parents=True, exist_ok=True)
        inputs = sorted(set(apk_directory.glob("*.apk")) | set(apk_directory.glob("*.manifest.xml")))
        results: list[APKAnalysisResult] = []
        failures_log = output_directory / "_failures.log"

        for input_path in inputs:
            cache_file = output_directory / f"{input_path.stem}.json"
            if input_path.name.endswith(".manifest.xml"):
                cache_file = output_directory / f"{input_path.name.removesuffix('.manifest.xml')}.json"
            try:
                if skip_existing and cache_file.exists():
                    payload = json.loads(cache_file.read_text(encoding="utf-8"))
                    results.append(APKAnalysisResult(**payload))
                    continue
                result = self.analyzer.analyze(input_path)
                cache_file.write_text(json.dumps(asdict(result), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                results.append(result)
            except Exception as exc:
                logger.exception("Failed to analyze %s", input_path)
                with failures_log.open("a", encoding="utf-8") as handle:
                    handle.write(f"{input_path}: {exc}\n")
                continue

        return sorted(results, key=lambda item: (item.package_name, item.version_code))
