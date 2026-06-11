import { colors } from "@/design/colors";
import type { AppVersion, PermissionsMetadata } from "@/types";

export interface SankeyDriftProps {
  appVersions: AppVersion[];
  permissionsMetadata: PermissionsMetadata;
  width?: number;
  height?: number;
}

export interface SankeyNode {
  id: string;        // e.g., "v1.0.0__LOCATION"
  version: string;
  group: string;
  permCount: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;     // 权限数
  isNew: boolean;    // 是否同组新增
}

export function SankeyDrift(props: SankeyDriftProps) {
  return (
    <div className="rounded-lg border border-dashed p-4" style={{ minHeight: props.height ?? 400, borderColor: colors.gray[300], backgroundColor: colors.gray[50], color: colors.gray[600] }}>
      <div className="font-medium">SankeyDrift · Chart placeholder · 待接入数据</div>
      <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
