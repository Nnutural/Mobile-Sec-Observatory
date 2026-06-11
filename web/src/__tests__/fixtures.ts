import type {
  App,
  AppVersion,
  CLRIData,
  FlowDiagram,
  PermissionsMetadata,
} from "@/types";

export const fixtureApps: App[] = [
  {
    id: "com.example.alpha",
    name: "Alpha",
    category_id: "Multimedia",
    category_zh: "媒体",
    summary: "",
    fdroid_url: "https://example.org/alpha",
    license: "MIT",
    versions: ["1.0.0", "1.1.0"],
    latest_version: "1.1.0",
  },
  {
    id: "com.example.beta",
    name: "Beta",
    category_id: "Reading",
    category_zh: "阅读",
    summary: "",
    fdroid_url: "https://example.org/beta",
    license: "MIT",
    versions: ["1.0.0"],
    latest_version: "1.0.0",
  },
];

function makeVersion(overrides: Partial<AppVersion> & Pick<AppVersion, "app_id" | "version_name" | "release_date">): AppVersion {
  return {
    version_code: 1,
    apk_sha256: "0".repeat(64),
    apk_size_kb: 1000,
    target_sdk: 33,
    min_sdk: 24,
    permissions: { all: [], dangerous: [], normal: [], signature: [], unknown: [] },
    permission_counts: { total: 0, dangerous: 0, normal: 0, signature: 0 },
    components: {
      activities: { total: 0, exported: 0 },
      services: { total: 0, exported: 0 },
      receivers: { total: 0, exported: 0 },
      providers: { total: 0, exported: 0 },
    },
    flags: {
      debuggable: false,
      allow_backup: false,
      cleartext_traffic: false,
      has_network_security_config: true,
    },
    ...overrides,
  };
}

export const fixtureVersions: AppVersion[] = [
  makeVersion({
    app_id: "com.example.alpha",
    version_name: "1.0.0",
    release_date: "2026-01-01",
    permissions: {
      all: ["android.permission.INTERNET", "android.permission.CAMERA"],
      dangerous: ["android.permission.CAMERA"],
      normal: ["android.permission.INTERNET"],
      signature: [],
      unknown: [],
    },
    permission_counts: { total: 2, dangerous: 1, normal: 1, signature: 0 },
  }),
  makeVersion({
    app_id: "com.example.alpha",
    version_name: "1.1.0",
    release_date: "2026-02-01",
    permissions: {
      all: [
        "android.permission.INTERNET",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
      ],
      dangerous: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"],
      normal: ["android.permission.INTERNET"],
      signature: [],
      unknown: [],
    },
    permission_counts: { total: 3, dangerous: 2, normal: 1, signature: 0 },
  }),
  makeVersion({
    app_id: "com.example.beta",
    version_name: "1.0.0",
    release_date: "2026-01-15",
    permissions: {
      all: ["android.permission.INTERNET"],
      dangerous: [],
      normal: ["android.permission.INTERNET"],
      signature: [],
      unknown: [],
    },
    permission_counts: { total: 1, dangerous: 0, normal: 1, signature: 0 },
  }),
];

export const fixturePermissionsMetadata: PermissionsMetadata = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00+08:00",
  source: "AOSP frameworks/base + manual annotation",
  permissions: {
    "android.permission.INTERNET": {
      name: "android.permission.INTERNET",
      level: "normal",
      group: "NETWORK",
      weight: 0.1,
      description: "Allows network sockets.",
      description_zh: "允许应用访问网络。",
    },
    "android.permission.CAMERA": {
      name: "android.permission.CAMERA",
      level: "dangerous",
      group: "CAMERA",
      weight: 0.8,
      description: "Allows camera access.",
      description_zh: "允许应用访问相机。",
    },
    "android.permission.RECORD_AUDIO": {
      name: "android.permission.RECORD_AUDIO",
      level: "dangerous",
      group: "MICROPHONE",
      weight: 0.85,
      description: "Allows recording audio.",
      description_zh: "允许应用录制音频。",
    },
  },
  groups: {
    NETWORK: { id: "NETWORK", name_zh: "网络", description_zh: "网络访问与状态。", permissions: ["android.permission.INTERNET"] },
    CAMERA: { id: "CAMERA", name_zh: "相机", description_zh: "相机能力。", permissions: ["android.permission.CAMERA"] },
    MICROPHONE: {
      id: "MICROPHONE",
      name_zh: "麦克风",
      description_zh: "麦克风能力。",
      permissions: ["android.permission.RECORD_AUDIO"],
    },
  },
};

export const fixtureClri: CLRIData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00+08:00",
  total_apps: 2,
  total_cves_considered: 2,
  app_scores: [
    {
      app_id: "com.example.alpha",
      app_name: "Alpha",
      category: "Multimedia",
      clri: 5.5,
      rank: 1,
      top_risk_permissions: [
        { permission: "android.permission.CAMERA", contribution: 3.2 },
        { permission: "android.permission.RECORD_AUDIO", contribution: 2.3 },
      ],
      top_associated_cves: [
        { cve_id: "CVE-2024-1001", rho: 0.6, severity: "High", component_category: "Media", contribution: 1.8 },
        { cve_id: "CVE-2024-1002", rho: 0.3, severity: "Critical", component_category: "Framework", contribution: 1.2 },
      ],
      component_breakdown: { Media: 1.8, Framework: 1.2 },
    },
    {
      app_id: "com.example.beta",
      app_name: "Beta",
      category: "Reading",
      clri: 1.3,
      rank: 2,
      top_risk_permissions: [{ permission: "android.permission.INTERNET", contribution: 1.3 }],
      top_associated_cves: [
        { cve_id: "CVE-2024-1001", rho: 0.2, severity: "High", component_category: "Media", contribution: 0.6 },
      ],
      component_breakdown: { Media: 0.6 },
    },
  ],
  permission_vuln_edges: [
    { source: "android.permission.CAMERA", target: "CVE-2024-1001", weight: 1.8, rho: 0.6 },
    { source: "android.permission.RECORD_AUDIO", target: "CVE-2024-1002", weight: 1.2, rho: 0.3 },
    { source: "android.permission.INTERNET", target: "CVE-2024-1001", weight: 0.6, rho: 0.2 },
  ],
};

export const fixtureFlow: { android: FlowDiagram; openharmony: FlowDiagram } = {
  android: {
    nodes: [
      { id: "manifest", label: "Manifest", type: "declaration" },
      { id: "runtime", label: "Runtime", type: "user" },
      { id: "api", label: "Sensitive API", type: "resource" },
    ],
    edges: [
      { from: "manifest", to: "runtime" },
      { from: "runtime", to: "api" },
    ],
  },
  openharmony: {
    nodes: [
      { id: "manifest", label: "module.json5", type: "declaration" },
      { id: "runtime", label: "AccessTokenManager", type: "user" },
      { id: "api", label: "Sensitive API", type: "resource" },
    ],
    edges: [
      { from: "manifest", to: "runtime" },
      { from: "runtime", to: "api" },
    ],
  },
};
