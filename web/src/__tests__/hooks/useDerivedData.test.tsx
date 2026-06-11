import type { PropsWithChildren } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppsWithLatest, usePDIRecomputed, useVulnFiltered } from "@/hooks/useDerivedData";
import type { AppsData, AppVersionsData, CLRIData, PDIData, VulnerabilitiesData } from "@/types";

const appsData: AppsData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  source: "F-Droid",
  fdroid_index_date: "2026-06-11",
  total_count: 1,
  apps: [
    {
      id: "org.example",
      name: "Example",
      category_id: "Development",
      category_zh: "开发工具",
      summary: "fixture",
      fdroid_url: "https://example.org",
      license: "Mock",
      versions: ["1.0.0", "1.1.0"],
      latest_version: "1.1.0",
    },
  ],
};

const versionsData: AppVersionsData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  total_count: 1,
  versions: [
    {
      app_id: "org.example",
      version_name: "1.1.0",
      version_code: 2,
      release_date: "2026-02-01",
      apk_sha256: "hash",
      apk_size_kb: 1,
      target_sdk: 35,
      min_sdk: 23,
      permissions: { all: [], dangerous: [], normal: [], signature: [], unknown: [] },
      permission_counts: { total: 2, dangerous: 1, normal: 1, signature: 0 },
      components: {
        activities: { total: 1, exported: 1 },
        services: { total: 0, exported: 0 },
        receivers: { total: 0, exported: 0 },
        providers: { total: 0, exported: 0 },
      },
      flags: {
        debuggable: false,
        allow_backup: false,
        cleartext_traffic: false,
        has_network_security_config: true,
      },
    },
  ],
};

const clriData: CLRIData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  total_apps: 1,
  total_cves_considered: 1,
  app_scores: [
    {
      app_id: "org.example",
      app_name: "Example",
      category: "Development",
      clri: 3.4,
      rank: 1,
      top_risk_permissions: [],
      top_associated_cves: [],
      component_breakdown: {},
    },
  ],
  permission_vuln_edges: [],
};

const vulnerabilitiesData: VulnerabilitiesData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  time_range: { start: "2024-01", end: "2024-02" },
  total_count: 2,
  vulnerabilities: [
    {
      cve_id: "CVE-1",
      bulletin_date: "2024-01-01",
      patch_level: "2024-01-01",
      severity: "High",
      type: "EoP",
      component: "Framework",
      component_category: "Framework",
      affected_versions: ["14"],
      vendor: "AOSP",
      bulletin_url: "https://example.org/1",
    },
    {
      cve_id: "CVE-2",
      bulletin_date: "2024-02-01",
      patch_level: "2024-02-01",
      severity: "Low",
      type: "DoS",
      component: "Kernel",
      component_category: "Kernel",
      affected_versions: ["14"],
      vendor: "AOSP",
      bulletin_url: "https://example.org/2",
    },
  ],
};

const pdiData: PDIData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  weights: { alpha: 0.3, beta: 0.4, gamma: 0.2, delta: 0.1 },
  summary_stats: {
    mean_pdi: 0,
    median_pdi: 0,
    max_pdi: 0,
    apps_with_drift: 1,
    apps_with_silent_expansion: 0,
  },
  results: [
    {
      app_id: "org.example",
      app_name: "Example",
      cumulative_pdi: 0,
      drift_sequence: [
        {
          from_version: "1.0.0",
          to_version: "1.1.0",
          from_release_date: "2026-01-01",
          to_release_date: "2026-02-01",
          components: { delta_d: 1, delta_s: 2, delta_c: 3, delta_e: 4 },
          pdi: 2,
          details: { new_dangerous_permissions: [], silent_expansion_groups: [], removed_permissions: [] },
        },
      ],
    },
  ],
};

const responses: Record<string, unknown> = {
  "/data/apps.json": appsData,
  "/data/app_versions.json": versionsData,
  "/data/clri_matrix.json": clriData,
  "/data/vulnerabilities.json": vulnerabilitiesData,
  "/data/pdi_results.json": pdiData,
};

function wrapper({ children }: PropsWithChildren) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>;
}

describe("useDerivedData", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const key = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      return Promise.resolve({
        json: () => Promise.resolve(responses[key]),
      } as Response);
    }) as unknown as typeof fetch;
  });

  it("combines apps, latest versions, and CLRI", async () => {
    const { result } = renderHook(() => useAppsWithLatest(), { wrapper });
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].latestVersion?.version_name).toBe("1.1.0");
    expect(result.current[0].clri).toBe(3.4);
  });

  it("filters vulnerabilities by range, severity, and component", async () => {
    const { result } = renderHook(
      () => useVulnFiltered({ startMonth: "2024-01", endMonth: "2024-01", severities: ["High"], componentCategory: "Framework" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].cve_id).toBe("CVE-1");
  });

  it("recomputes PDI with external weights", async () => {
    const { result } = renderHook(() => usePDIRecomputed({ alpha: 0.25, beta: 0.25, gamma: 0.25, delta: 0.25 }), {
      wrapper,
    });
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].drift_sequence[0].pdi).toBe(2.5);
    expect(result.current[0].cumulative_pdi).toBe(2.5);
  });
});
