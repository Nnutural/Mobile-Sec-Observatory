"""Batch APK analysis skeleton."""

from pathlib import Path

from pipeline.analyzers.apk_analyzer import APKAnalysisResult, APKAnalyzer


class BatchAPKAnalyzer:
    """Run APKAnalyzer over a directory of APK files with cache support."""

    def __init__(self, analyzer: APKAnalyzer):
        """Initialize batch runner with a single APK analyzer."""
        self.analyzer = analyzer

    def analyze_dataset(
        self,
        apk_directory: Path,
        output_directory: Path,
        skip_existing: bool = True,
    ) -> list[APKAnalysisResult]:
        """批量分析所有 APK,结果缓存到磁盘。"""
        raise NotImplementedError("TODO: implement in week 1/2")
