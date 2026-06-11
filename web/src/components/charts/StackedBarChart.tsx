import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors } from "@/design/colors";

export interface StackedBarDatum {
  label: string;
  [key: string]: number | string;
}

export interface StackedBarChartProps {
  data: StackedBarDatum[];
  stacks: Array<{ key: string; name: string; color: string }>;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  labelFormatter?: (label: string) => string;
}

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

export function StackedBarChart({
  data,
  stacks,
  height = 280,
  xAxisLabel,
  yAxisLabel,
  labelFormatter = (label) => `应用：${label}`,
}: StackedBarChartProps) {
  if (data.length === 0 || stacks.length === 0) {
    return <EmptyChart height={height} />;
  }

  return (
    <div className="w-full" style={{ height }}>
      <div className="sr-only">{stacks.map((stack) => stack.name).join("、")}</div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: xAxisLabel ? 34 : 12 }}>
          <CartesianGrid stroke={colors.gray[200]} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.gray[600], fontSize: 12 }}
            axisLine={{ stroke: colors.gray[300] }}
            tickLine={{ stroke: colors.gray[300] }}
            label={
              xAxisLabel
                ? { value: xAxisLabel, position: "insideBottom", offset: -18, fill: colors.gray[600], fontSize: 12 }
                : undefined
            }
          />
          <YAxis
            tick={{ fill: colors.gray[600], fontSize: 12 }}
            axisLine={{ stroke: colors.gray[300] }}
            tickLine={{ stroke: colors.gray[300] }}
            label={
              yAxisLabel
                ? { value: yAxisLabel, angle: -90, position: "insideLeft", fill: colors.gray[600], fontSize: 12 }
                : undefined
            }
          />
          <Tooltip
            formatter={(value, name) => [`${value}`, `${name}`]}
            labelFormatter={(label) => labelFormatter(String(label))}
            wrapperStyle={{ top: 8, right: 8 }}
            contentStyle={{ borderColor: colors.gray[200], color: colors.gray[800] }}
          />
          <Legend formatter={(value) => <span style={{ color: colors.gray[700] }}>{value}</span>} />
          {stacks.map((stack) => (
            <Bar key={stack.key} dataKey={stack.key} name={stack.name} fill={stack.color} stackId="stack" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
