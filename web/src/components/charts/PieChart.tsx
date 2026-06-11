import { Cell, Legend, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from "recharts";
import { colors } from "@/design/colors";
import { formatNumber, formatPercent } from "@/utils/formatters";

export interface PieChartDatum {
  name: string;
  value: number;
  color: string;
}

export interface PieChartProps {
  data: PieChartDatum[];
  height?: number;
  innerRadius?: number;
  showTotal?: boolean;
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

export function PieChart({ data, height = 240, innerRadius = 60, showTotal = true }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0 || total <= 0) {
    return <EmptyChart height={height} />;
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div className="sr-only">{data.map((item) => item.name).join("、")}</div>
      {showTotal ? (
        <div className="pointer-events-none absolute left-[38%] top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-xl font-semibold" style={{ color: colors.gray[900] }}>
            {formatNumber(total)}
          </div>
          <div className="text-xs" style={{ color: colors.gray[500] }}>
            总数
          </div>
        </div>
      ) : null}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart margin={{ top: 12, right: 20, bottom: 12, left: 0 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="38%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={Math.max(innerRadius + 28, 86)}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const numeric = Number(value);
              return [`${formatNumber(numeric)} (${formatPercent(numeric / total)})`, `${name}`];
            }}
            wrapperStyle={{ top: 8, right: 8 }}
            contentStyle={{ borderColor: colors.gray[200], color: colors.gray[800] }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => <span style={{ color: colors.gray[700] }}>{value}</span>}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
