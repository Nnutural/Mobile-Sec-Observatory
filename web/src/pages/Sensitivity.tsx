import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import type { PDIWeights } from "@/hooks/useDerivedData";
import { encodeCustomWeights, useSensitivityState, type SensitivityCombination } from "@/hooks/useSensitivityState";
import { useApps, usePDI } from "@/hooks/useData";
import type { AppPDIResult } from "@/types";
import { formatNumber } from "@/utils/formatters";
import { categoryColor } from "@/utils/i18n";
import { spearmanRank } from "@/utils/spearman";

const TOP_N = 10;

function computeCumulative(results: AppPDIResult[], weights: PDIWeights): Map<string, number> {
  const cumulative = new Map<string, number>();
  results.forEach((result) => {
    const total = result.drift_sequence.reduce(
      (sum, transition) =>
        sum +
        weights.alpha * transition.components.delta_d +
        weights.beta * transition.components.delta_s +
        weights.gamma * transition.components.delta_c +
        weights.delta * transition.components.delta_e,
      0,
    );
    cumulative.set(result.app_id, total);
  });
  return cumulative;
}

function ranksFromCumulative(cumulative: Map<string, number>): Map<string, number> {
  const sorted = Array.from(cumulative.entries()).sort((a, b) => b[1] - a[1]);
  const rankMap = new Map<string, number>();
  sorted.forEach(([appId], index) => rankMap.set(appId, index + 1));
  return rankMap;
}

function normalizeWeights(weights: PDIWeights): PDIWeights {
  const sum = weights.alpha + weights.beta + weights.gamma + weights.delta;
  if (sum <= 0) return { alpha: 0.25, beta: 0.25, gamma: 0.25, delta: 0.25 };
  return {
    alpha: weights.alpha / sum,
    beta: weights.beta / sum,
    gamma: weights.gamma / sum,
    delta: weights.delta / sum,
  };
}

function presetDisplayLabel(combo: SensitivityCombination): string {
  return combo.custom
    ? `自定义 α=${combo.weights.alpha.toFixed(2)} β=${combo.weights.beta.toFixed(2)} γ=${combo.weights.gamma.toFixed(2)} δ=${combo.weights.delta.toFixed(2)}`
    : combo.label;
}

export function Sensitivity() {
  const { data: pdi } = usePDI();
  const { data: apps } = useApps();
  const { combinations, setPresets } = useSensitivityState();
  const [panelOpen, setPanelOpen] = useState(false);
  const [autoNormalize, setAutoNormalize] = useState(true);
  const [draft, setDraft] = useState<PDIWeights>({ alpha: 0.3, beta: 0.3, gamma: 0.3, delta: 0.1 });
  const [copied, setCopied] = useState(false);

  const ranksByCombination = useMemo(() => {
    if (!pdi) return null;
    return combinations.map((combo) => {
      const cumulative = computeCumulative(pdi.results, combo.weights);
      return { combo, cumulative, ranks: ranksFromCumulative(cumulative) };
    });
  }, [combinations, pdi]);

  const baselineRanks = ranksByCombination?.[0]?.ranks;
  const topAppIds = useMemo(() => {
    if (!baselineRanks) return [] as string[];
    return Array.from(baselineRanks.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, TOP_N)
      .map(([appId]) => appId);
  }, [baselineRanks]);

  const lineData = useMemo(() => {
    if (!ranksByCombination) return [];
    return ranksByCombination.map(({ combo, ranks }) => {
      const datum: Record<string, number | string> = { preset: presetDisplayLabel(combo) };
      topAppIds.forEach((appId) => {
        datum[appId] = ranks.get(appId) ?? TOP_N + 1;
      });
      return datum;
    });
  }, [ranksByCombination, topAppIds]);

  const spearmanMatrix = useMemo(() => {
    if (!ranksByCombination || !pdi) return [];
    const appIds = pdi.results.map((result) => result.app_id);
    return ranksByCombination.map((row) => {
      const values = ranksByCombination.map((column) => {
        const rowRanks = appIds.map((id) => row.ranks.get(id) ?? appIds.length + 1);
        const columnRanks = appIds.map((id) => column.ranks.get(id) ?? appIds.length + 1);
        return spearmanRank(rowRanks, columnRanks);
      });
      return { label: presetDisplayLabel(row.combo), values };
    });
  }, [pdi, ranksByCombination]);

  const meanCorrelation = useMemo(() => {
    if (spearmanMatrix.length <= 1) return 1;
    const values: number[] = [];
    spearmanMatrix.forEach((row, rowIndex) => {
      row.values.forEach((value, colIndex) => {
        if (rowIndex !== colIndex) values.push(value);
      });
    });
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [spearmanMatrix]);

  const conclusionText = useMemo(() => {
    if (meanCorrelation > 0.9) return "PDI 排名对权重整体不敏感，稳定性高";
    if (meanCorrelation > 0.7) return "PDI 排名中度依赖权重选择，稳定性中等";
    return "PDI 排名对权重敏感，稳定性低，论文解读需谨慎";
  }, [meanCorrelation]);

  if (!pdi || !apps || !ranksByCombination) return <Skeleton className="h-[760px] w-full" />;

  const presetColumns: Array<DataTableColumn<{ label: string; alpha: number; beta: number; gamma: number; delta: number }>> = [
    { key: "label", header: "组合名", sortable: true },
    { key: "alpha", header: "α (ΔD)", align: "right", render: (row) => formatNumber(row.alpha, 2) },
    { key: "beta", header: "β (ΔS)", align: "right", render: (row) => formatNumber(row.beta, 2) },
    { key: "gamma", header: "γ (ΔC)", align: "right", render: (row) => formatNumber(row.gamma, 2) },
    { key: "delta", header: "δ (ΔE)", align: "right", render: (row) => formatNumber(row.delta, 2) },
  ];
  const presetRows = combinations.map((combo) => ({ label: presetDisplayLabel(combo), ...combo.weights }));
  const appNameById = new Map(apps.apps.map((app) => [app.id, app.name_zh ?? app.name]));
  const appCategoryById = new Map(apps.apps.map((app) => [app.id, app.category_id]));

  const addCustom = () => {
    if (combinations.length >= 8) {
      alert("请先移除旧组合");
      return;
    }
    const weights = autoNormalize ? normalizeWeights(draft) : draft;
    setPresets([...combinations.map((combo) => combo.token), encodeCustomWeights(weights)]);
  };

  const removeCustom = (token: string) => {
    setPresets(combinations.filter((combo) => combo.token !== token).map((combo) => combo.token));
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>敏感性分析</CardTitle>
            <p className="mt-2 text-sm leading-6" style={{ color: colors.gray[600] }}>
              PDI 公式中的 α/β/γ/δ 具有主观设定空间，本页用多组权重重算排名并比较 Spearman 相关性。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={copyLink}>
            {copied ? "已复制" : "复制本页链接"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" variant="outline" onClick={() => setPanelOpen((current) => !current)}>
            自定义权重组合
          </Button>
          {panelOpen && (
            <div className="rounded-md border p-4" style={{ borderColor: colors.gray[200] }}>
              <div className="grid gap-3 md:grid-cols-5">
                {(["alpha", "beta", "gamma", "delta"] as Array<keyof PDIWeights>).map((key) => (
                  <label key={key} className="text-sm" style={{ color: colors.gray[700] }}>
                    {key}
                    <Input
                      className="mt-1"
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={draft[key]}
                      onChange={(event) => setDraft((current) => ({ ...current, [key]: Number(event.currentTarget.value) }))}
                    />
                  </label>
                ))}
                <label className="flex items-center gap-2 pt-6 text-sm" style={{ color: colors.gray[700] }}>
                  <input
                    type="checkbox"
                    checked={autoNormalize}
                    onChange={(event) => setAutoNormalize(event.currentTarget.checked)}
                  />
                  自动归一化
                </label>
              </div>
              <Button type="button" className="mt-3" onClick={addCustom}>
                加入对比
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {combinations.map((combo) => (
              <Badge key={combo.token} variant={combo.custom ? "outline" : "default"} className="gap-2 py-1">
                <span>{presetDisplayLabel(combo)}</span>
                {combo.custom && (
                  <button type="button" aria-label={`移除 ${presetDisplayLabel(combo)}`} onClick={() => removeCustom(combo.token)}>
                    ×
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <ChartCard title="权重组合" subtitle="当前参与对比的权重组合" exportName="sensitivity_presets">
        <DataTable columns={presetColumns} rows={presetRows} pageSize={10} />
      </ChartCard>

      <ChartCard title="Top-10 排名对比" subtitle="同一应用在不同权重组合下的排名" exportName="sensitivity_top10">
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} />
              <XAxis dataKey="preset" tick={{ fill: colors.gray[700], fontSize: 12 }} interval={0} />
              <YAxis reversed domain={[1, TOP_N + 1]} tick={{ fill: colors.gray[700], fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: colors.gradient.diverging[2], borderColor: colors.gray[200] }}
                formatter={(value: number, name: string) => [`第 ${value} 名`, appNameById.get(name) ?? name]}
              />
              <Legend formatter={(value: string) => appNameById.get(value) ?? value} wrapperStyle={{ fontSize: 12 }} />
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

      <ChartCard title="权重组合 Spearman 相关矩阵" subtitle="矩阵随当前组合数量动态扩展" exportName="sensitivity_spearman">
        <div className="overflow-auto">
          <table data-testid="spearman-matrix" className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border px-3 py-2 text-left" style={{ borderColor: colors.gray[200], color: colors.gray[700] }}>
                  组合
                </th>
                {spearmanMatrix.map((column) => (
                  <th key={column.label} className="border px-3 py-2 text-center" style={{ borderColor: colors.gray[200] }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spearmanMatrix.map((row) => (
                <tr key={row.label}>
                  <td className="border px-3 py-2 font-medium" style={{ borderColor: colors.gray[200], color: colors.gray[800] }}>
                    {row.label}
                  </td>
                  {row.values.map((value, index) => {
                    const intensity = Math.max(0, Math.min(1, (value + 1) / 2));
                    const palette = colors.gradient.blue;
                    const idx = Math.min(palette.length - 1, Math.floor(intensity * (palette.length - 1)));
                    return (
                      <td
                        key={index}
                        data-testid="spearman-value"
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
          全部 {combinations.length} 组权重之间的平均 Spearman 相关系数为{" "}
          <span className="font-semibold" style={{ color: colors.primary[700] }}>
            {formatNumber(meanCorrelation, 3)}
          </span>
          ，结论：<span className="font-semibold">{conclusionText}</span>
        </CardContent>
      </Card>
    </div>
  );
}
