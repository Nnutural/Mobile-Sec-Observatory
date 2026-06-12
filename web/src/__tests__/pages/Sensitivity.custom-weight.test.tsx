import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sensitivity } from "@/pages/Sensitivity";
import type { AppsData, PDIData } from "@/types";

const pdi: PDIData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  weights: { alpha: 0.3, beta: 0.4, gamma: 0.2, delta: 0.1 },
  summary_stats: { mean_pdi: 1, median_pdi: 1, max_pdi: 2, apps_with_drift: 2, apps_with_silent_expansion: 1 },
  results: ["a", "b", "c"].map((appId, index) => ({
    app_id: appId,
    app_name: appId,
    cumulative_pdi: index + 1,
    drift_sequence: [
      {
        from_version: "1",
        to_version: "2",
        from_release_date: "2026-01-01",
        to_release_date: "2026-02-01",
        components: { delta_d: index + 1, delta_s: 1, delta_c: 1, delta_e: 0 },
        pdi: index + 1,
        details: { new_dangerous_permissions: [], silent_expansion_groups: [], removed_permissions: [] },
      },
    ],
  })),
};

const apps: AppsData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  source: "F-Droid",
  fdroid_index_date: "2026-06-11",
  total_count: 3,
  apps: [
    { id: "a", name: "Alpha", category_id: "Development", category_zh: "开发", summary: "", fdroid_url: "x", license: "MIT", versions: ["1", "2"], latest_version: "2" },
    { id: "b", name: "Beta", category_id: "Reading", category_zh: "阅读", summary: "", fdroid_url: "x", license: "MIT", versions: ["1", "2"], latest_version: "2" },
    { id: "c", name: "Gamma", category_id: "Internet", category_zh: "网络", summary: "", fdroid_url: "x", license: "MIT", versions: ["1", "2"], latest_version: "2" },
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderPage(path: string) {
  return render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <MemoryRouter initialEntries={[path]}>
        <Sensitivity />
        <LocationProbe />
      </MemoryRouter>
    </SWRConfig>,
  );
}

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

describe("Sensitivity custom weights", () => {
  it("expands the Spearman matrix from 5x5 to 6x6 after adding a custom combination", async () => {
    renderPage("/sensitivity");

    await waitFor(() => expect(screen.getAllByTestId("spearman-value")).toHaveLength(25));
    fireEvent.click(screen.getByRole("button", { name: "自定义权重组合" }));
    fireEvent.click(screen.getByRole("button", { name: "加入对比" }));

    await waitFor(() => expect(screen.getAllByTestId("spearman-value")).toHaveLength(36));
  });

  it("initializes from URL presets with one custom combination", async () => {
    renderPage("/sensitivity?presets=baseline,custom:0.4-0.2-0.2-0.2");

    await waitFor(() => expect(screen.getAllByTestId("spearman-value")).toHaveLength(4));
  });

  it("updates URL after removing a custom combination", async () => {
    renderPage("/sensitivity?presets=baseline,custom:0.4-0.2-0.2-0.2");

    await waitFor(() => expect(screen.getAllByText(/自定义 α=0.40/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: /移除 自定义 α=0.40/ }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("?presets=baseline"));
  });
});
