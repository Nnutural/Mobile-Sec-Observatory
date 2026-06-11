# Reproducibility

当前版本只提供骨架与 mock 数据。复现入口为：

```bash
scripts/setup_web.sh
scripts/setup_pipeline.sh
scripts/reproduce.sh
```

后续阶段应补齐 F-Droid 索引采集、Android Security Bulletin 解析、APK 静态分析、PDI/CLRI 计算和 JSON 导出，使 `web/public/data/` 中的 10 个文件可由 pipeline 重新生成。
