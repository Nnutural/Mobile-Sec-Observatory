# MSO Pipeline

Python 数据生产端骨架。当前仅包含 CLI、dataclass、类签名与跳过状态的测试，不实现 F-Droid 采集、Bulletin 解析、APK 分析、PDI/CLRI 或 JSON 导出算法。

```bash
python -m pipeline.main --help
python -m pipeline.main run-all
pytest
```
