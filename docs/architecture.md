# Architecture

MobileSec Observatory 采用完全解耦的双端架构：Python pipeline 负责采集、解析、计算与导出，React SPA 只读取 `web/public/data/*.json` 中的静态数据，不依赖后端 API 或运行时服务。

当前仓库仅包含骨架与 mock 数据，真实采集、APK 静态分析、PDI/CLRI 计算和图表实现以 `研究报告实验/实验开发方案.md` 为准逐阶段补齐。
