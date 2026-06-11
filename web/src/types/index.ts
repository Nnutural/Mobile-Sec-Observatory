export interface AppsData {
  schema_version: "1.0";
  generated_at: string;  // ISO 8601
  source: "F-Droid";
  fdroid_index_date: string;
  total_count: number;
  apps: App[];
}

export interface App {
  id: string;                       // packageName
  name: string;
  name_zh?: string;
  category_id: string;              // F-Droid category
  category_zh: string;              // 显示用中文类别
  summary: string;
  description?: string;
  fdroid_url: string;
  source_url?: string;
  license: string;
  icon_path?: string;
  versions: string[];               // version_name 列表,按时间正序
  latest_version: string;
}

export interface AppVersionsData {
  schema_version: "1.0";
  generated_at: string;
  total_count: number;
  versions: AppVersion[];
}

export interface AppVersion {
  app_id: string;
  version_name: string;
  version_code: number;
  release_date: string;             // YYYY-MM-DD
  apk_sha256: string;
  apk_size_kb: number;
  
  // SDK
  target_sdk: number;
  min_sdk: number;
  
  // 权限
  permissions: {
    all: string[];
    dangerous: string[];
    normal: string[];
    signature: string[];
    unknown: string[];              // 在元数据中未找到的权限
  };
  
  permission_counts: {
    total: number;
    dangerous: number;
    normal: number;
    signature: number;
  };
  
  // 组件
  components: {
    activities: { total: number; exported: number };
    services: { total: number; exported: number };
    receivers: { total: number; exported: number };
    providers: { total: number; exported: number };
  };
  
  // 安全标志
  flags: {
    debuggable: boolean;
    allow_backup: boolean;
    cleartext_traffic: boolean;
    has_network_security_config: boolean;
  };
}

export interface PermissionsMetadata {
  schema_version: "1.0";
  generated_at: string;
  source: "AOSP frameworks/base + manual annotation";
  permissions: {
    [permission_name: string]: PermissionMeta;
  };
  groups: {
    [group_id: string]: PermissionGroup;
  };
}

export interface PermissionMeta {
  name: string;                     // android.permission.XXX
  level: "normal" | "dangerous" | "signature" | "signatureOrSystem";
  group?: string;
  weight: number;                   // 0.0 - 1.0
  description: string;
  description_zh: string;
  introduced_in_api?: number;
  deprecated_in_api?: number;
}

export interface PermissionGroup {
  id: string;
  name_zh: string;
  description_zh: string;
  permissions: string[];
}

export interface PDIData {
  schema_version: "1.0";
  generated_at: string;
  weights: {
    alpha: number;                  // ΔD 权重
    beta: number;                   // ΔS 权重
    gamma: number;                  // ΔC 权重
    delta: number;                  // ΔE 权重
  };
  summary_stats: {
    mean_pdi: number;
    median_pdi: number;
    max_pdi: number;
    apps_with_drift: number;        // PDI > 0 的应用数
    apps_with_silent_expansion: number;
  };
  results: AppPDIResult[];
}

export interface AppPDIResult {
  app_id: string;
  app_name: string;
  drift_sequence: PDITransition[];
  cumulative_pdi: number;
}

export interface PDITransition {
  from_version: string;
  to_version: string;
  from_release_date: string;
  to_release_date: string;
  components: {
    delta_d: number;
    delta_s: number;
    delta_c: number;
    delta_e: number;
  };
  pdi: number;
  details: {
    new_dangerous_permissions: string[];
    silent_expansion_groups: string[];
    removed_permissions: string[];
  };
}

export interface VulnerabilitiesData {
  schema_version: "1.0";
  generated_at: string;
  time_range: {
    start: string;                  // YYYY-MM
    end: string;
  };
  total_count: number;
  vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
  cve_id: string;
  bulletin_date: string;
  patch_level: string;              // YYYY-MM-DD
  severity: "Critical" | "High" | "Moderate" | "Low";
  type: "RCE" | "EoP" | "ID" | "DoS" | "N/A";
  component: string;                // 原始组件名
  component_category: "Framework" | "System" | "Media" | "Kernel" | "Vendor";
  affected_versions: string[];
  vendor: string;
  bulletin_url: string;
}

export interface CLRIData {
  schema_version: "1.0";
  generated_at: string;
  total_apps: number;
  total_cves_considered: number;
  app_scores: AppCLRI[];
  permission_vuln_edges: PVEdge[];  // 用于力导向图
}

export interface AppCLRI {
  app_id: string;
  app_name: string;
  category: string;
  clri: number;
  rank: number;
  top_risk_permissions: Array<{
    permission: string;
    contribution: number;
  }>;
  top_associated_cves: Array<{
    cve_id: string;
    rho: number;
    severity: string;
    component_category: string;
    contribution: number;
  }>;
  component_breakdown: {
    [component: string]: number;
  };
}

export interface PVEdge {
  source: string;                   // permission name
  target: string;                   // cve_id
  weight: number;                   // rho * severity_score
  rho: number;
}

export interface ComparisonData {
  schema_version: "1.0";
  generated_at: string;
  data_collection_date: string;
  dimensions: ComparisonDimension[];
  flow_diagrams: {
    android: FlowDiagram;
    openharmony: FlowDiagram;
  };
  advantages_disadvantages: {
    openharmony_advantages: AdvantageItem[];
    openharmony_disadvantages: AdvantageItem[];
  };
  recommendations: Recommendation[];
}

export interface ComparisonDimension {
  id: string;
  name_zh: string;
  description_zh: string;
  android: {
    mechanism: string;
    details: string;
    source_url: string;
  };
  openharmony: {
    mechanism: string;
    details: string;
    source_url: string;
  };
  advantage: "android" | "openharmony" | "neutral";
  advantage_reason: string;
}

export interface FlowDiagram {
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ from: string; to: string; label?: string }>;
}

export interface AdvantageItem {
  id: string;
  title: string;
  description: string;
  evidence: string[];
}

export interface Recommendation {
  id: string;                       // R1, R2, ...
  category: string;
  title: string;
  description: string;
  benchmark: string;                // 对标实践
  priority: "high" | "medium" | "low";
}

export interface DashboardStats {
  schema_version: "1.0";
  generated_at: string;
  
  overview: {
    total_apps: number;
    total_apk_versions: number;
    total_cves: number;
    bulletin_months: number;
    avg_dangerous_permissions: number;
    avg_clri: number;
    high_risk_apps_count: number;
    apps_with_drift_count: number;
  };
  
  vuln_monthly_trend: Array<{
    month: string;                  // YYYY-MM
    critical: number;
    high: number;
    moderate: number;
    low: number;
  }>;
  
  permission_category_distribution: Array<{
    category: string;
    permission_count: number;
    avg_dangerous: number;
  }>;
}

export interface PermissionAPIMap {
  schema_version: "1.0";
  generated_at: string;
  sources: ["PScout", "Axplorer", "Android Official Docs"];
  coverage: {
    [api_level: string]: { total_apis: number; mapped_apis: number };
  };
  mappings: {
    [permission_name: string]: {
      apis: string[];
      api_count: number;
      source: string;
    };
  };
}

export interface ComponentAPIMap {
  schema_version: "1.0";
  generated_at: string;
  mappings: {
    [component_category: string]: {
      apis: string[];
      typical_files: string[];
    };
  };
}
