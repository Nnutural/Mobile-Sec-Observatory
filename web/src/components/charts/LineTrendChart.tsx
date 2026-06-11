import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors } from "@/design/colors";
import { formatMonth } from "@/utils/formatters";

export interface LineTrendDatum {
  month: string;
  [key: string]: number | string;
}

export interface LineTrendChartProps {
  data: LineTrendDatum[];
  series: Array<{ key: string; name: string; color: string }>;
  height?: number;
  mode?: "line" | "area";
  smooth?: boolean;
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

export function LineTrendChart({
  data,
  series,
  height = 240,
  mode = "line",
  smooth = true,
}: LineTrendChartProps) {
  if (data.length === 0 || series.length === 0) {
    return <EmptyChart height={height} />;
  }

  const lineType = smooth ? "monotone" : "linear";
  const commonChart = (
    <>
      <CartesianGrid stroke={colors.gray[200]} strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="month"
        tickFormatter={formatMonth}
        tick={{ fill: colors.gray[600], fontSize: 12 }}
        axisLine={{ stroke: colors.gray[300] }}
        tickLine={{ stroke: colors.gray[300] }}
      />
      <YAxis tick={{ fill: colors.gray[600], fontSize: 12 }} axisLine={{ stroke: colors.gray[300] }} />
      <Tooltip
        formatter={(value, name) => [`${value}`, `${name}`]}
        labelFormatter={(label) => `月份：${formatMonth(String(label))}`}
        wrapperStyle={{ top: 8, right: 8 }}
        contentStyle={{ borderColor: colors.gray[200], color: colors.gray[800] }}
      />
      <Legend formatter={(value) => <span style={{ color: colors.gray[700] }}>{value}</span>} />
    </>
  );

  if (mode === "area") {
    return (
      <div className="w-full" style={{ height }}>
        <div className="sr-only">{series.map((item) => item.name).join("、")}</div>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 12 }}>
            <defs>
              {series.map((item) => (
                <linearGradient key={item.key} id={`area-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={item.color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={item.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            {commonChart}
            {series.map((item) => (
              <Area
                key={item.key}
                dataKey={item.key}
                name={item.name}
                type={lineType}
                stroke={item.color}
                fill={`url(#area-${item.key})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <div className="sr-only">{series.map((item) => item.name).join("、")}</div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 12 }}>
          {commonChart}
          {series.map((item) => (
            <Line
              key={item.key}
              dataKey={item.key}
              name={item.name}
              type={lineType}
              stroke={item.color}
              strokeWidth={2}
              dot={{ r: 3, fill: item.color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
