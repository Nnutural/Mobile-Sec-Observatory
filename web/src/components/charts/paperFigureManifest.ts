export const PAPER_FIGURE_EXPORT_NAMES = [
  "dashboard_trend",
  "dashboard_top_clri",
  "atlas_android",
  "atlas_openharmony",
  "atlas_compare",
  "perm_overview",
  "permission_heatmap",
  "combo_matrix",
  "perm_table",
  "force_graph",
  "drift_timeline",
  "drift_radar",
  "pdi_decomp",
  "sankey_drift",
  "drift_compare_trend",
  "drift_compare_sankey",
  "drift_compare_expansion_rank",
  "vuln_trend",
  "vuln_component",
  "vuln_severity_pie",
  "vuln_type_component",
  "vuln_table",
  "comparison_flow",
  "sensitivity_presets",
  "sensitivity_top10",
  "sensitivity_spearman",
] as const;

export const PAPER_FIGURE_EXPORT_NAME_SET = new Set<string>(PAPER_FIGURE_EXPORT_NAMES);

export const PAPER_FIGURE_EXPORT_ORDER = new Map<string, number>(
  PAPER_FIGURE_EXPORT_NAMES.map((name, index) => [name, index]),
);
