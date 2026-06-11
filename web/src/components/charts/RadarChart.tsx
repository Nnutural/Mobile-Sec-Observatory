import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { colors } from "@/design/colors";
import { formatNumber } from "@/utils/formatters";

export interface RadarChartDatum {
  axis: string;
  value: number;
  fullMark?: number;
}

export interface RadarChartProps {
  data: RadarChartDatum[];
  height?: number;
  name?: string;
  color?: string;
}

const AXIS_LABEL: Record<string, string> = {
  "ΔD": "ΔD 新增危险权限",
  "ΔS": "ΔS 同组扩张",
  "ΔC": "ΔC 网络-敏感组合",
  "ΔE": "ΔE 暴露组件",
};

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex w-full items-center justify-center rounded-lg border text-sm"
      style={{ height, borderColor: colors.gray[200], backgroundColor: colors.gray[50], color: colors.gray[500] }}
    >
      暂无数据
    </div>
  );
}

export function RadarChart({ data, height = 280, name = "PDI 分量", color = colors.primary[500] }: RadarChartProps) {
  if (data.length === 0) {
    return <EmptyChart height={height} />;
  }

  const maxValue = Math.max(...data.map((item) => item.fullMark ?? item.value), 0);
  const fullMark = maxValue > 0 ? maxValue * 1.2 : 1;
  const normalized = data.map((item) => ({
    ...item,
    axisLabel: AXIS_LABEL[item.axis] ?? item.axis,
    fullMark: item.fullMark ?? fullMark,
  }));

  return (
    <div className="w-full" style={{ height }}>
      <div className="sr-only">{normalized.map((item) => item.axisLabel).join("、")}</div>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart data={normalized} margin={{ top: 24, right: 24, bottom: 12, left: 24 }}>
          <PolarGrid stroke={colors.gray[200]} />
          <PolarAngleAxis dataKey="axisLabel" tick={{ fill: colors.gray[700], fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, fullMark]} tick={{ fill: colors.gray[500], fontSize: 11 }} />
          <Tooltip
            formatter={(value, label) => [formatNumber(Number(value), 2), `${label}`]}
            wrapperStyle={{ top: 8, right: 8 }}
            contentStyle={{ borderColor: colors.gray[200], color: colors.gray[800] }}
          />
          <Radar name={name} dataKey="value" stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
