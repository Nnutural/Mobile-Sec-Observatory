import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sensitivity } from "@/pages/Sensitivity";
import type { AppsData, PDIData } from "@/types";

const pdi: PDIData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00+08:00",
  weights: { alpha: 0.3, beta: 0.4, gamma: 0.2, delta: 0.1 },
  summary_stats: { mean_pdi: 1, median_pdi: 1, max_pdi: 2, apps_with_drift: 2, apps_with_silent_expansion: 1 },
  results: [
    {
      app_id: "com.example.alpha",
      app_name: "Alpha",
      drift_sequence: [
        {
          from_version: "1.0",
          to_version: "1.1",
          from_release_date: "2026-01-01",
          to_release_date: "2026-02-01",
          components: { delta_d: 2, delta_s: 1, delta_c: 1, delta_e: 0.5 },
          pdi: 1.3,
          details: { new_dangerous_permissions: [], silent_expansion_groups: [], removed_permissions: [] },
        },
      ],
      cumulative_pdi: 1.3,
    },
    {
      app_id: "com.example.beta",
      app_name: "Beta",
      drift_sequence: [
        {
          from_version: "1.0",
          to_version: "1.1",
          from_release_date: "2026-01-01",
          to_release_date: "2026-02-01",
          components: { delta_d: 0.5, delta_s: 0.2, delta_c: 0.1, delta_e: 0 },
          pdi: 0.3,
          details: { new_dangerous_permissions: [], silent_expansion_groups: [], removed_permissions: [] },
        },
      ],
      cumulative_pdi: 0.3,
    },
  ],
};

const apps: AppsData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00+08:00",
  source: "F-Droid",
  fdroid_index_date: "2026-06-11",
  total_count: 2,
  apps: [
    { id: "com.example.alpha", name: "Alpha", category_id: "Multimedia", category_zh: "媒体", summary: "", fdroid_url: "x", license: "MIT", versions: ["1.0", "1.1"], latest_version: "1.1" },
    { id: "com.example.beta", name: "Beta", category_id: "Reading", category_zh: "阅读", summary: "", fdroid_url: "x", license: "MIT", versions: ["1.0", "1.1"], latest_version: "1.1" },
  ],
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch" as never).mockImplementation((async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    let payload: unknown = {};
    if (url.endsWith("/data/pdi_results.json")) payload = pdi;
    else if (url.endsWith("/data/apps.json")) payload = apps;
    return { ok: true, status: 200, json: async () => payload } as Response;
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <MemoryRouter>
        <Sensitivity />
      </MemoryRouter>
    </SWRConfig>,
  );
}

describe("Sensitivity page", () => {
  it("renders presets, top10 and Spearman sections", async () => {
    const view = renderPage();

    await waitFor(() => expect(view.getByText("权重组合")).toBeInTheDocument());
    expect(view.getByText("Top-10 排名对比")).toBeInTheDocument();
    expect(view.getByText("权重组合 Spearman 相关矩阵")).toBeInTheDocument();
  });

  it("renders 5 default preset rows", async () => {
    const view = renderPage();

    await waitFor(() => {
      ["基线", "突出 ΔD", "突出 ΔS", "均衡", "完全等权"].forEach((label) => {
        expect(view.getAllByText(label).length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
