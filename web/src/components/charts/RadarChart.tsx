import { colors } from "@/design/colors";

export interface RadarChartProps {
  data?: unknown;
  height?: number;
}

export function RadarChart(props: RadarChartProps) {
  return (
    <div className="rounded-lg border border-dashed p-4" style={{ minHeight: props.height ?? 280, borderColor: colors.gray[300], backgroundColor: colors.gray[50], color: colors.gray[600] }}>
      <div className="font-medium">RadarChart · Chart placeholder · 待接入数据</div>
      <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
