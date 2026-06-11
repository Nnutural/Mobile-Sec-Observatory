import type { AppVersion, PermissionsMetadata } from "@/types";

export interface SankeyDriftNode {
  id: string;
  versionName: string;
  groupId: string;
  groupLabel: string;
  permissions: string[];
}

export interface SankeyDriftLink {
  sourceId: string;
  targetId: string;
  value: number;
  added: string[];
  removed: string[];
  isExpansion: boolean;
}

export interface SankeyDriftDataset {
  nodes: SankeyDriftNode[];
  links: SankeyDriftLink[];
}

export function buildSankeyDataset(
  appVersions: AppVersion[],
  permissionsMetadata: PermissionsMetadata,
): SankeyDriftDataset {
  if (appVersions.length < 2) return { nodes: [], links: [] };
  const sorted = [...appVersions].sort((a, b) =>
    a.release_date.localeCompare(b.release_date) || a.version_code - b.version_code,
  );

  const permissionToGroup = new Map<string, string>();
  Object.values(permissionsMetadata.permissions).forEach((permission) => {
    if (permission.group) permissionToGroup.set(permission.name, permission.group);
  });

  const groupLabels = new Map<string, string>();
  Object.values(permissionsMetadata.groups).forEach((group) => {
    groupLabels.set(group.id, group.name_zh);
  });

  const versionGroupPermissions = sorted.map((version) => {
    const groups = new Map<string, string[]>();
    version.permissions.all.forEach((permission) => {
      const groupId = permissionToGroup.get(permission) ?? "OTHER";
      const list = groups.get(groupId) ?? [];
      list.push(permission);
      groups.set(groupId, list);
    });
    return { version, groups };
  });

  const allGroupIds = new Set<string>();
  versionGroupPermissions.forEach((entry) => {
    entry.groups.forEach((_, key) => allGroupIds.add(key));
  });

  const nodes: SankeyDriftNode[] = [];
  versionGroupPermissions.forEach(({ version, groups }) => {
    allGroupIds.forEach((groupId) => {
      const permissions = groups.get(groupId) ?? [];
      if (permissions.length === 0) return;
      nodes.push({
        id: `${version.version_name}__${groupId}`,
        versionName: version.version_name,
        groupId,
        groupLabel: groupLabels.get(groupId) ?? groupId,
        permissions,
      });
    });
  });

  const links: SankeyDriftLink[] = [];
  for (let i = 0; i + 1 < versionGroupPermissions.length; i += 1) {
    const current = versionGroupPermissions[i];
    const next = versionGroupPermissions[i + 1];
    allGroupIds.forEach((groupId) => {
      const before = current.groups.get(groupId) ?? [];
      const after = next.groups.get(groupId) ?? [];
      if (before.length === 0 && after.length === 0) return;
      const added = after.filter((permission) => !before.includes(permission));
      const removed = before.filter((permission) => !after.includes(permission));
      const isExpansion = before.length > 0 && after.length > before.length;
      const value = Math.max(1, Math.min(before.length, after.length) + added.length);
      const sourceId = `${current.version.version_name}__${groupId}`;
      const targetId = `${next.version.version_name}__${groupId}`;
      const sourceExists = nodes.some((node) => node.id === sourceId);
      const targetExists = nodes.some((node) => node.id === targetId);
      if (!sourceExists || !targetExists) return;
      links.push({ sourceId, targetId, value, added, removed, isExpansion });
    });
  }

  return { nodes, links };
}

const GROUP_COLOR_KEYS = [
  "location",
  "camera",
  "microphone",
  "contacts",
  "sms",
  "storage",
  "phone",
  "network",
  "sensors",
  "calendar",
] as const;

export function colorForGroup(groupId: string, palette: Record<(typeof GROUP_COLOR_KEYS)[number], string>): string {
  const lower = groupId.toLowerCase();
  for (const key of GROUP_COLOR_KEYS) {
    if (lower.includes(key)) return palette[key];
  }
  let hash = 0;
  for (let i = 0; i < groupId.length; i += 1) hash = (hash * 31 + groupId.charCodeAt(i)) | 0;
  const choice = GROUP_COLOR_KEYS[Math.abs(hash) % GROUP_COLOR_KEYS.length];
  return palette[choice];
}
