# Sample Selection

样本选择规则来自 `研究报告实验/实验开发方案.md` §2.1.1。

```yaml
selection_criteria:
  total_apps: 30
  categories:
    - id: "Development"
      count: 6
      examples: ["NewPipe", "Termux", "Material Files"]
    - id: "Internet"
      count: 6
      examples: ["Element", "Briar", "K-9 Mail"]
    - id: "Multimedia"
      count: 6
      examples: ["VLC", "AntennaPod", "Vinyl Music Player"]
    - id: "Navigation"
      count: 6
      examples: ["OsmAnd", "Organic Maps", "AntennaPod"]
    - id: "Reading"
      count: 6
      examples: ["Markor", "Joplin", "FBReader"]
  per_app:
    min_versions: 3
    version_strategy: "latest_3_consecutive"
    min_target_sdk: 26
    max_apk_size_mb: 80
random_seed: 42
```
