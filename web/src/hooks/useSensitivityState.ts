import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { PDIWeights } from "@/hooks/useDerivedData";

export interface SensitivityCombination {
  token: string;
  id: string;
  label: string;
  weights: PDIWeights;
  custom: boolean;
}

export const BASE_PRESETS: SensitivityCombination[] = [
  { token: "baseline", id: "baseline", label: "基线", weights: { alpha: 0.3, beta: 0.4, gamma: 0.2, delta: 0.1 }, custom: false },
  { token: "emphasize_D", id: "emphasize_D", label: "突出 ΔD", weights: { alpha: 0.4, beta: 0.3, gamma: 0.2, delta: 0.1 }, custom: false },
  { token: "emphasize_S", id: "emphasize_S", label: "突出 ΔS", weights: { alpha: 0.2, beta: 0.5, gamma: 0.2, delta: 0.1 }, custom: false },
  { token: "balanced", id: "balanced", label: "均衡", weights: { alpha: 0.3, beta: 0.3, gamma: 0.3, delta: 0.1 }, custom: false },
  { token: "full_equal", id: "full_equal", label: "完全等权", weights: { alpha: 0.25, beta: 0.25, gamma: 0.25, delta: 0.25 }, custom: false },
];

const presetByToken = new Map(BASE_PRESETS.map((preset) => [preset.token, preset]));

function roundToken(value: number): string {
  return Number(value.toFixed(4)).toString();
}

export function encodeCustomWeights(weights: PDIWeights): string {
  return `custom:${roundToken(weights.alpha)}-${roundToken(weights.beta)}-${roundToken(weights.gamma)}-${roundToken(weights.delta)}`;
}

function parseCustom(token: string): SensitivityCombination | null {
  const raw = token.replace(/^custom:/, "");
  const parts = raw.split("-").map(Number);
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) return null;
  const weights = { alpha: parts[0], beta: parts[1], gamma: parts[2], delta: parts[3] };
  return {
    token: encodeCustomWeights(weights),
    id: encodeCustomWeights(weights),
    label: `自定义 α=${weights.alpha.toFixed(2)} β=${weights.beta.toFixed(2)} γ=${weights.gamma.toFixed(2)} δ=${weights.delta.toFixed(2)}`,
    weights,
    custom: true,
  };
}

function parseTokens(raw: string | null): SensitivityCombination[] {
  if (!raw) return BASE_PRESETS;
  const parsed = raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => presetByToken.get(token) ?? (token.startsWith("custom:") ? parseCustom(token) : null))
    .filter((item): item is SensitivityCombination => item !== null);
  return parsed.length > 0 ? parsed : BASE_PRESETS;
}

export function useSensitivityState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const combinations = useMemo(() => parseTokens(searchParams.get("presets")), [searchParams]);

  const writeTokens = (tokens: string[]) => {
    const next = new URLSearchParams(searchParams);
    next.set("presets", tokens.join(","));
    setSearchParams(next);
  };

  const setPresets = (tokens: string[]) => writeTokens(tokens);

  const setCustomWeights = (customWeights: PDIWeights[]) => {
    const baseTokens = combinations.filter((combo) => !combo.custom).map((combo) => combo.token);
    writeTokens([...baseTokens, ...customWeights.map(encodeCustomWeights)]);
  };

  return { combinations, setPresets, setCustomWeights };
}
