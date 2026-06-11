import { useMemo } from "react";
import type { App, AppPDIResult, AppVersion, PDITransition, Vulnerability } from "@/types";
import { useAppVersions, useApps, useCLRI, usePDI, useVulnerabilities } from "@/hooks/useData";

export interface AppsWithLatest {
  app: App;
  latestVersion?: AppVersion;
  clri: number;
}

export interface VulnFilters {
  startMonth?: string;
  endMonth?: string;
  severities?: readonly Vulnerability["severity"][];
  componentCategory?: Vulnerability["component_category"] | "all";
  type?: Vulnerability["type"] | "all";
}

export interface PDIWeights {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
}

function recomputeTransition(transition: PDITransition, weights: PDIWeights): PDITransition {
  const pdi =
    weights.alpha * transition.components.delta_d +
    weights.beta * transition.components.delta_s +
    weights.gamma * transition.components.delta_c +
    weights.delta * transition.components.delta_e;

  return {
    ...transition,
    pdi,
  };
}

export function useAppsWithLatest(): AppsWithLatest[] {
  const { data: appsData } = useApps();
  const { data: versionsData } = useAppVersions();
  const { data: clriData } = useCLRI();

  return useMemo(() => {
    if (!appsData || !versionsData) return [];
    return appsData.apps.map((app) => {
      const versions = versionsData.versions
        .filter((version) => version.app_id === app.id)
        .sort((a, b) => a.release_date.localeCompare(b.release_date) || a.version_code - b.version_code);
      const latestVersion =
        versions.find((version) => version.version_name === app.latest_version) ?? versions[versions.length - 1];
      const clri = clriData?.app_scores.find((score) => score.app_id === app.id)?.clri ?? 0;
      return { app, latestVersion, clri };
    });
  }, [appsData, clriData, versionsData]);
}

export function useVulnFiltered(filters: VulnFilters): Vulnerability[] {
  const { data } = useVulnerabilities();

  return useMemo(() => {
    if (!data) return [];
    const severities = filters.severities ? new Set(filters.severities) : null;
    return data.vulnerabilities.filter((vulnerability) => {
      const month = vulnerability.bulletin_date.slice(0, 7);
      const inStart = !filters.startMonth || month >= filters.startMonth;
      const inEnd = !filters.endMonth || month <= filters.endMonth;
      const inSeverity = !severities || severities.has(vulnerability.severity);
      const inComponent =
        !filters.componentCategory ||
        filters.componentCategory === "all" ||
        vulnerability.component_category === filters.componentCategory;
      const inType = !filters.type || filters.type === "all" || vulnerability.type === filters.type;
      return inStart && inEnd && inSeverity && inComponent && inType;
    });
  }, [data, filters.componentCategory, filters.endMonth, filters.severities, filters.startMonth, filters.type]);
}

export function usePDIRecomputed(weights: PDIWeights, appId?: string): AppPDIResult[] {
  const { data } = usePDI();

  return useMemo(() => {
    if (!data) return [];
    return data.results
      .filter((result) => !appId || result.app_id === appId)
      .map((result) => {
        let cumulative = 0;
        const driftSequence = result.drift_sequence.map((transition) => {
          const recomputed = recomputeTransition(transition, weights);
          cumulative += recomputed.pdi;
          return recomputed;
        });
        return {
          ...result,
          drift_sequence: driftSequence,
          cumulative_pdi: cumulative,
        };
      });
  }, [appId, data, weights]);
}
