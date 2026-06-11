import type { CLRIData } from "@/types";

export interface ForceNode {
  id: string;
  kind: "app" | "permission" | "cve";
  label: string;
  radius: number;
  severity?: string;
  componentCategory?: string;
  clri?: number;
  fx?: number | null;
  fy?: number | null;
  x?: number;
  y?: number;
}

export interface ForceLink {
  source: string;
  target: string;
  kind: "app-perm" | "perm-cve";
  weight: number;
}

export interface ForceDataset {
  nodes: ForceNode[];
  links: ForceLink[];
}

const APP_RADIUS_MIN = 14;
const APP_RADIUS_MAX = 28;
const PERMISSION_RADIUS = 9;
const CVE_RADIUS_MIN = 7;
const CVE_RADIUS_MAX = 13;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildForceDataset(
  clri: CLRIData,
  topPermPerApp: number,
  topCvePerPerm: number,
): ForceDataset {
  const apps = clri.app_scores;
  if (apps.length === 0) return { nodes: [], links: [] };

  const clriMax = Math.max(...apps.map((app) => app.clri), 1);

  const nodes: ForceNode[] = [];
  const links: ForceLink[] = [];
  const nodeIds = new Set<string>();

  function addNode(node: ForceNode) {
    if (nodeIds.has(node.id)) return;
    nodes.push(node);
    nodeIds.add(node.id);
  }

  const permissionContribByApp = new Map<string, Map<string, number>>();
  apps.forEach((app) => {
    const radius = APP_RADIUS_MIN + (app.clri / clriMax) * (APP_RADIUS_MAX - APP_RADIUS_MIN);
    addNode({ id: `app:${app.app_id}`, kind: "app", label: app.app_name, radius, clri: app.clri });

    const topPerms = [...app.top_risk_permissions]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, topPermPerApp);
    const permMap = new Map<string, number>();
    topPerms.forEach((entry) => permMap.set(entry.permission, entry.contribution));
    permissionContribByApp.set(app.app_id, permMap);

    topPerms.forEach((entry) => {
      addNode({
        id: `perm:${entry.permission}`,
        kind: "permission",
        label: entry.permission.replace("android.permission.", ""),
        radius: PERMISSION_RADIUS,
      });
      links.push({
        source: `app:${app.app_id}`,
        target: `perm:${entry.permission}`,
        kind: "app-perm",
        weight: entry.contribution,
      });
    });
  });

  // PVEdges 为 perm-cve 关系；只保留与已加入的权限相关的边
  const edgesByPerm = new Map<string, typeof clri.permission_vuln_edges>();
  clri.permission_vuln_edges.forEach((edge) => {
    const list = edgesByPerm.get(edge.source) ?? [];
    list.push(edge);
    edgesByPerm.set(edge.source, list);
  });

  const cveSeverity = new Map<string, string>();
  const cveComponent = new Map<string, string>();
  apps.forEach((app) => {
    app.top_associated_cves.forEach((entry) => {
      cveSeverity.set(entry.cve_id, entry.severity);
      cveComponent.set(entry.cve_id, entry.component_category);
    });
  });

  const permIds = new Set(nodes.filter((node) => node.kind === "permission").map((node) => node.id.replace("perm:", "")));
  permIds.forEach((permission) => {
    const edges = edgesByPerm.get(permission) ?? [];
    const top = [...edges].sort((a, b) => b.weight - a.weight).slice(0, topCvePerPerm);
    top.forEach((edge) => {
      const severity = cveSeverity.get(edge.target) ?? "Moderate";
      const componentCategory = cveComponent.get(edge.target) ?? "System";
      const radius = clamp(CVE_RADIUS_MIN + edge.weight * 4, CVE_RADIUS_MIN, CVE_RADIUS_MAX);
      addNode({
        id: `cve:${edge.target}`,
        kind: "cve",
        label: edge.target,
        radius,
        severity,
        componentCategory,
      });
      links.push({
        source: `perm:${permission}`,
        target: `cve:${edge.target}`,
        kind: "perm-cve",
        weight: edge.weight,
      });
    });
  });

  return { nodes, links };
}
