import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { colors } from "@/design/colors";
import type { PDIWeights } from "@/hooks/useDerivedData";
import type { PDITransition } from "@/types";
import { formatNumber } from "@/utils/formatters";

export interface PDIDecompositionBarProps {
  transition?: PDITransition;
  weights?: PDIWeights;
  height?: number;
}

const DEFAULT_WEIGHTS: PDIWeights = { alpha: 0.3, beta: 0.4, gamma: 0.2, delta: 0.1 };

const segments = [
  { key: "alpha", name: "α·ΔD 危险权限新增", color: colors.primary[500] },
  { key: "beta", name: "β·ΔS 同组扩张", color: colors.severity.high },
  { key: "gamma", name: "γ·ΔC 网络-敏感组合", color: colors.severity.moderate },
  { key: "delta", name: "δ·ΔE 暴露组件", color: colors.severity.low },
] as const;

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

export function PDIDecompositionBar({ transition, weights = DEFAULT_WEIGHTS, height = 220 }: PDIDecompositionBarProps) {
  if (!transition) {
    return <EmptyChart height={height} />;
  }

  const data = [
    {
      label: `${transition.from_version} → ${transition.to_version}`,
      alpha: weights.alpha * transition.components.delta_d,
      beta: weights.beta * transition.components.delta_s,
      gamma: weights.gamma * transition.components.delta_c,
      delta: weights.delta * transition.components.delta_e,
    },
  ];
  const pdi = data[0].alpha + data[0].beta + data[0].gamma + data[0].delta;

  return (
    <div className="w-full" style={{ height }}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span style={{ color: colors.gray[700] }}>{data[0].label}</span>
        <span className="font-semibold" style={{ color: colors.primary[700] }}>
          总 PDI：{formatNumber(pdi, 4)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(height - 32, 120)}>
        <BarChart data={data} stackOffset="sign" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke={colors.gray[200]} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: colors.gray[600], fontSize: 12 }} axisLine={{ stroke: colors.gray[300] }} />
          <YAxis tick={{ fill: colors.gray[600], fontSize: 12 }} axisLine={{ stroke: colors.gray[300] }} />
          <Tooltip
            formatter={(value, name) => [formatNumber(Number(value), 2), `${name}`]}
            wrapperStyle={{ top: 8, right: 8 }}
            contentStyle={{ borderColor: colors.gray[200], color: colors.gray[800] }}
          />
          <Legend formatter={(value) => <span style={{ color: colors.gray[700] }}>{value}</span>} />
          {segments.map((segment) => (
            <Bar key={segment.key} dataKey={segment.key} name={segment.name} fill={segment.color} stackId="pdi" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
