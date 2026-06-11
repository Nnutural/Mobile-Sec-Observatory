# MobileSec Observatory

MobileSec Observatory (MSO) 是一个移动安全课程研究型可视化平台。项目将 Python 数据生产端与 React 静态展示端解耦，二者只通过 `web/public/data/*.json` 中的 10 个静态 JSON 文件通信。

当前阶段：骨架。前端提供可运行的 Dashboard、7 个导航页面与 mock JSON 占位渲染；pipeline 提供 CLI、模块接口、dataclass 与跳过状态的测试骨架，尚未实现 PDI、CLRI、Bulletin 解析或 APK 分析算法。

## 目录

- `web/`：React 18 + TypeScript + Vite + Tailwind 静态 SPA。
- `pipeline/`：Python 3.10+ 数据采集、分析、指标与导出骨架。
- `docs/`：架构、数据 Schema、复现和样本选择说明。
- `scripts/`：环境初始化、部署和复现占位脚本。

## 运行

```bash
cd web
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。

```bash
cd pipeline
python -m pipeline.main --help
python -m pipeline.main run-all
pytest
```

完整方案文档见 `研究报告实验/实验开发方案.md`。
