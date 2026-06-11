import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useApps, usePDI } from "@/hooks/useData";
import { usePDIRecomputed, type PDIWeights } from "@/hooks/useDerivedData";
import type { AppPDIResult } from "@/types";
import { formatNumber } from "@/utils/formatters";
import { categoryColor } from "@/utils/i18n";
import { spearmanRank } from "@/utils/spearman";

interface WeightPreset {
  id: string;
  label: string;
  weights: PDIWeights;
}

// 方案 §5.4 五组权重预设
const PRESETS: WeightPreset[] = [
  { id: "baseline", label: "基线", weights: { alpha: 0.3, beta: 0.4, gamma: 0.2, delta: 0.1 } },
  { id: "emphasize_D", label: "突出 ΔD", weights: { alpha: 0.4, beta: 0.3, gamma: 0.2, delta: 0.1 } },
  { id: "emphasize_S", label: "突出 ΔS", weights: { alpha: 0.2, beta: 0.5, gamma: 0.2, delta: 0.1 } },
  { id: "balanced", label: "均衡", weights: { alpha: 0.3, beta: 0.3, gamma: 0.3, delta: 0.1 } },
  { id: "full_equal", label: "完全等权", weights: { alpha: 0.25, beta: 0.25, gamma: 0.25, delta: 0.25 } },
];

const TOP_N = 10;

function computeCumulative(results: AppPDIResult[], weights: PDIWeights): Map<string, number> {
  const cumulative = new Map<string, number>();
  results.forEach((result) => {
    const total = result.drift_sequence.reduce((sum, transition) => {
      return (
        sum +
        weights.alpha * transition.components.delta_d +
        weights.beta * transition.components.delta_s +
        weights.gamma * transition.components.delta_c +
        weights.delta * transition.components.delta_e
      );
    }, 0);
    cumulative.set(result.app_id, total);
  });
  return cumulative;
}

function ranksFromCumulative(cumulative: Map<string, number>): Map<string, number> {
  const sorted = Array.from(cumulative.entries()).sort((a, b) => b[1] - a[1]);
  const rankMap = new Map<string, number>();
  sorted.forEach(([appId], index) => {
    rankMap.set(appId, index + 1);
  });
  return rankMap;
}

export function Sensitivity() {
  const { data: pdi } = usePDI();
  const { data: apps } = useApps();
  const baselineResults = usePDIRecomputed(PRESETS[0].weights);

  const allCumulative = useMemo(() => {
    if (!pdi) return null;
    return PRESETS.map((preset) => ({
      preset,
      cumulative: computeCumulative(pdi.results, preset.weights),
    }));
  }, [pdi]);

  const ranksByPreset = useMemo(() => {
    if (!allCumulative) return null;
    return allCumulative.map(({ preset, cumulative }) => ({
      preset,
      cumulative,
      ranks: ranksFromCumulative(cumulative),
    }));
  }, [allCumulative]);

  const baselineRanks = ranksByPreset?.[0]?.ranks;
  const topAppIds = useMemo(() => {
    if (!baselineRanks || !pdi) return [] as string[];
    return Array.from(baselineRanks.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, TOP_N)
      .map(([appId]) => appId);
  }, [baselineRanks, pdi]);

  const lineData = useMemo(() => {
    if (!ranksByPreset) return [];
    return ranksByPreset.map(({ preset, ranks }) => {
      const datum: Record<string, number | string> = { preset: preset.label };
      topAppIds.forEach((appId) => {
        const rank = ranks.get(appId);
        datum[appId] = rank ?? TOP_N + 1;
      });
      return datum;
    });
  }, [ranksByPreset, topAppIds]);

  const spearmanMatrix = useMemo(() => {
    if (!ranksByPreset || ranksByPreset.length === 0 || !pdi) return [];
    const appIds = pdi.results.map((result) => result.app_id);
    return ranksByPreset.map((row) => {
      const values = ranksByPreset.map((column) => {
        const rowRanks = appIds.map((id) => row.ranks.get(id) ?? appIds.length + 1);
        const columnRanks = appIds.map((id) => column.ranks.get(id) ?? appIds.length + 1);
        return spearmanRank(rowRanks, columnRanks);
      });
      return { presetLabel: row.preset.label, values };
    });
  }, [pdi, ranksByPreset]);

  const meanCorrelation = useMemo(() => {
    if (spearmanMatrix.length === 0) return 0;
    const baselineRow = spearmanMatrix[0]?.values ?? [];
    if (baselineRow.length <= 1) return 1;
    const others = baselineRow.slice(1);
    return others.reduce((sum, value) => sum + value, 0) / others.length;
  }, [spearmanMatrix]);

  const conclusionText = useMemo(() => {
    if (meanCorrelation > 0.9) return "PDI 排名对权重整体不敏感（高稳定性）";
    if (meanCorrelation > 0.7) return "PDI 排名中度依赖权重选择";
    return "PDI 排名对权重敏感，论文需谨慎解读";
  }, [meanCorrelation]);

  if (!pdi || !apps || !baselineResults || !ranksByPreset) {
    return <Skeleton className="h-[760px] w-full" />;
  }

  const presetColumns: Array<DataTableColumn<{ label: string; alpha: number; beta: number; gamma: number; delta: number }>> = [
    { key: "label", header: "组合名", sortable: true },
    { key: "alpha", header: "α (ΔD)", align: "right", render: (row) => formatNumber(row.alpha, 2) },
    { key: "beta", header: "β (ΔS)", align: "right", render: (row) => formatNumber(row.beta, 2) },
    { key: "gamma", header: "γ (ΔC)", align: "right", render: (row) => formatNumber(row.gamma, 2) },
    { key: "delta", header: "δ (ΔE)", align: "right", render: (row) => formatNumber(row.delta, 2) },
  ];

  const presetRows = PRESETS.map((preset) => ({ label: preset.label, ...preset.weights }));

  const appNameById = new Map(apps.apps.map((app) => [app.id, app.name_zh ?? app.name]));
  const appCategoryById = new Map(apps.apps.map((app) => [app.id, app.category_id]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>为什么要做敏感性分析</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-7" style={{ color: colors.gray[700] }}>
          <p>
            PDI 公式中 α/β/γ/δ 四个权重的取值具有一定主观性。为评估排名结果的稳健性，本页面对 5 组常见权重组合复算 PDI，
            观察 Top-10 应用排名的变化与各组合之间的 Spearman 相关系数。
          </p>
          <p style={{ color: colors.gray[500] }}>
            参考方案 §1.6 论证与 §5.4 实验脚本，结论文本根据本次数据动态生成，避免硬编码。
          </p>
        </CardContent>
      </Card>

      <ChartCard title="权重组合" subtitle="5 组预设权重一览" exportName="sensitivity_presets">
        <DataTable columns={presetColumns} rows={presetRows} pageSize={10} />
      </ChartCard>

      <ChartCard
        title="Top-10 排名对比"
        subtitle="同一应用在不同权重组合下的排名（1 最危险，越靠下越靠后）"
        exportName="sensitivity_top10"
      >
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} />
              <XAxis dataKey="preset" tick={{ fill: colors.gray[700], fontSize: 12 }} />
              <YAxis
                reversed
                domain={[1, TOP_N + 1]}
                tick={{ fill: colors.gray[700], fontSize: 12 }}
                label={{ value: "排名", angle: -90, position: "insideLeft", fill: colors.gray[500] }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: colors.gradient.diverging[2], borderColor: colors.gray[200] }}
                formatter={(value: number, name: string) => [`第 ${value} 名`, appNameById.get(name) ?? name]}
              />
              <Legend
                formatter={(value: string) => appNameById.get(value) ?? value}
                wrapperStyle={{ fontSize: 12, color: colors.gray[600] }}
              />
              {topAppIds.map((appId) => (
                <Line
                  key={appId}
                  dataKey={appId}
                  type="monotone"
                  stroke={categoryColor(appCategoryById.get(appId) ?? "")}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="权重组合 Spearman 相关矩阵"
        subtitle="行与列分别对应一组权重；色阶越深，排名越相近"
        exportName="sensitivity_spearman"
      >
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border px-3 py-2 text-left" style={{ borderColor: colors.gray[200], color: colors.gray[700] }}>
                  组合
                </th>
                {spearmanMatrix.map((column) => (
                  <th
                    key={column.presetLabel}
                    className="border px-3 py-2 text-center"
                    style={{ borderColor: colors.gray[200], color: colors.gray[700] }}
                  >
                    {column.presetLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spearmanMatrix.map((row) => (
                <tr key={row.presetLabel}>
                  <td className="border px-3 py-2 font-medium" style={{ borderColor: colors.gray[200], color: colors.gray[800] }}>
                    {row.presetLabel}
                  </td>
                  {row.values.map((value, index) => {
                    const intensity = Math.max(0, Math.min(1, (value + 1) / 2));
                    const palette = colors.gradient.blue;
                    const idx = Math.min(palette.length - 1, Math.floor(intensity * (palette.length - 1)));
                    return (
                      <td
                        key={index}
                        className="border px-3 py-2 text-center tabular-nums"
                        style={{
                          borderColor: colors.gray[200],
                          backgroundColor: palette[idx],
                          color: idx > 3 ? colors.gradient.diverging[2] : colors.gray[900],
                        }}
                      >
                        {formatNumber(value, 3)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle>结论</CardTitle>
        </CardHeader>
        <CardContent className="text-sm" style={{ color: colors.gray[700] }}>
          <p>
            与基线权重相比，其他 4 组方案的 Spearman 平均相关系数为
            <span className="mx-1 font-semibold" style={{ color: colors.primary[700] }}>
              {formatNumber(meanCorrelation, 3)}
            </span>
            。结论：
            <span className="ml-1 font-semibold" style={{ color: colors.severity.moderate }}>
              {conclusionText}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
