import { Slider } from "@/components/ui/slider";
import { colors } from "@/design/colors";
import type { PDIWeights } from "@/hooks/useDerivedData";
import { formatNumber } from "@/utils/formatters";

export interface WeightSliderProps {
  weights: PDIWeights;
  onChange: (next: PDIWeights) => void;
  sumNormalized?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const weightItems: Array<{ key: keyof PDIWeights; label: string }> = [
  { key: "alpha", label: "α 危险权限新增" },
  { key: "beta", label: "β 同组扩张" },
  { key: "gamma", label: "γ 网络-敏感组合" },
  { key: "delta", label: "δ 暴露组件" },
];

function normalizeWeights(weights: PDIWeights, changedKey: keyof PDIWeights, nextValue: number): PDIWeights {
  const keys = weightItems.map((item) => item.key);
  const otherKeys = keys.filter((key) => key !== changedKey);
  const remaining = Math.max(1 - nextValue, 0);
  const otherSum = otherKeys.reduce((sum, key) => sum + weights[key], 0);
  const next = { ...weights, [changedKey]: nextValue };

  otherKeys.forEach((key) => {
    next[key] = otherSum > 0 ? (weights[key] / otherSum) * remaining : remaining / otherKeys.length;
  });

  return next;
}

export function WeightSlider({
  weights,
  onChange,
  sumNormalized = true,
  min = 0,
  max = 1,
  step = 0.01,
}: WeightSliderProps) {
  const total = weights.alpha + weights.beta + weights.gamma + weights.delta;

  return (
    <div className="rounded-lg border p-5" style={{ borderColor: colors.gray[200], backgroundColor: colors.gradient.diverging[2] }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold" style={{ color: colors.gray[900] }}>
          权重敏感性分析
        </div>
        <div className="text-xs" style={{ color: colors.gray[500] }}>
          当前总和 {formatNumber(total, 2)}
          {sumNormalized ? "（已自动归一化）" : ""}
        </div>
      </div>
      <div className="space-y-4">
        {weightItems.map((item) => (
          <label key={item.key} className="grid grid-cols-[128px_1fr_52px] items-center gap-3 text-sm">
            <span style={{ color: colors.gray[700] }}>{item.label}</span>
            <Slider
              min={min}
              max={max}
              step={step}
              value={weights[item.key]}
              aria-label={item.label}
              onChange={(event) => {
                const nextValue = Number(event.currentTarget.value);
                onChange(sumNormalized ? normalizeWeights(weights, item.key, nextValue) : { ...weights, [item.key]: nextValue });
              }}
            />
            <span className="text-right tabular-nums" style={{ color: colors.gray[700] }}>
              {formatNumber(weights[item.key], 2)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
