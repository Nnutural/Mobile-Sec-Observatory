import { colors } from "@/design/colors";

export interface DataTableProps {
  columns?: string[];
  rows?: unknown[];
  height?: number;
}

export function DataTable(props: DataTableProps) {
  return (
    <div className="rounded-lg border border-dashed p-4" style={{ minHeight: props.height ?? 220, borderColor: colors.gray[300], backgroundColor: colors.gray[50], color: colors.gray[600] }}>
      <div className="font-medium">DataTable · Chart placeholder · 待接入数据</div>
      <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
