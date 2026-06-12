import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Drift } from "@/pages/Drift";
import type { AppVersionsData, AppsData, PDIData, PermissionsMetadata } from "@/types";

vi.mock("@/components/charts/SankeyDrift", () => ({
  SankeyDrift: () => <div data-testid="mock-sankey">Sankey</div>,
}));

const apps: AppsData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  source: "F-Droid",
  fdroid_index_date: "2026-06-11",
  total_count: 3,
  apps: [
    { id: "a", name: "Alpha", name_zh: "甲应用", category_id: "Development", category_zh: "开发", summary: "", fdroid_url: "x", license: "MIT", versions: ["1", "2"], latest_version: "2" },
    { id: "b", name: "Beta", name_zh: "乙应用", category_id: "Reading", category_zh: "阅读", summary: "", fdroid_url: "x", license: "MIT", versions: ["1", "2"], latest_version: "2" },
    { id: "c", name: "Gamma", name_zh: "丙应用", category_id: "Internet", category_zh: "网络", summary: "", fdroid_url: "x", license: "MIT", versions: ["1", "2"], latest_version: "2" },
  ],
};

const pdi: PDIData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  weights: { alpha: 0.3, beta: 0.4, gamma: 0.2, delta: 0.1 },
  summary_stats: { mean_pdi: 1, median_pdi: 1, max_pdi: 2, apps_with_drift: 3, apps_with_silent_expansion: 2 },
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
        components: { delta_d: index + 1, delta_s: 1, delta_c: 0, delta_e: 0 },
        pdi: index + 1,
        details: { new_dangerous_permissions: [], silent_expansion_groups: ["CAMERA"], removed_permissions: [] },
      },
    ],
  })),
};

const versions: AppVersionsData = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  total_count: 6,
  versions: apps.apps.flatMap((app, appIndex) =>
    ["1", "2"].map((versionName, index) => ({
      app_id: app.id,
      version_name: versionName,
      version_code: index + 1,
      release_date: `2026-0${index + 1}-01`,
      apk_sha256: `${appIndex}${index}`,
      apk_size_kb: 1,
      target_sdk: 33,
      min_sdk: 23,
      permissions: { all: [], dangerous: [], normal: [], signature: [], unknown: [] },
      permission_counts: { total: 0, dangerous: 0, normal: 0, signature: 0 },
      components: {
        activities: { total: 0, exported: 0 },
        services: { total: 0, exported: 0 },
        receivers: { total: 0, exported: 0 },
        providers: { total: 0, exported: 0 },
      },
      flags: { debuggable: false, allow_backup: false, cleartext_traffic: false, has_network_security_config: true },
    })),
  ),
};

const metadata: PermissionsMetadata = {
  schema_version: "1.0",
  generated_at: "2026-06-11T00:00:00Z",
  source: "AOSP frameworks/base + manual annotation",
  permissions: {},
  groups: { CAMERA: { id: "CAMERA", name_zh: "相机", description_zh: "", permissions: [] } },
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderDrift(path: string) {
  return render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <MemoryRouter initialEntries={[path]}>
        <Drift />
        <LocationProbe />
      </MemoryRouter>
    </SWRConfig>,
  );
}

beforeEach(() => {
  vi.spyOn(globalThis, "fetch" as never).mockImplementation((async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    let payload: unknown = {};
    if (url.endsWith("/data/apps.json")) payload = apps;
    else if (url.endsWith("/data/pdi_results.json")) payload = pdi;
    else if (url.endsWith("/data/app_versions.json")) payload = versions;
    else if (url.endsWith("/data/permissions_metadata.json")) payload = metadata;
    return { ok: true, status: 200, json: async () => payload } as Response;
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Drift compare mode", () => {
  it("renders two LineChart series when two apps are selected", async () => {
    renderDrift("/drift?apps=a,b");

    await waitFor(() => expect(screen.getAllByTestId("drift-compare-series")).toHaveLength(2));
  });

  it("restores compare state from ?apps=a,b on refresh", async () => {
    renderDrift("/drift?apps=a,b");

    await waitFor(() => expect(screen.getByRole("button", { name: "移除 甲应用" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "移除 乙应用" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("?apps=a,b");
  });

  it("keeps two apps after selecting three and removing one", async () => {
    renderDrift("/drift?apps=a,b");

    await waitFor(() => expect(screen.getAllByTestId("drift-compare-series")).toHaveLength(2));
    fireEvent.change(screen.getByLabelText("添加对比应用"), { target: { value: "c" } });
    await waitFor(() => expect(screen.getAllByTestId("drift-compare-series")).toHaveLength(3));
    fireEvent.click(screen.getByRole("button", { name: "移除 乙应用" }));

    await waitFor(() => expect(screen.getAllByTestId("drift-compare-series")).toHaveLength(2));
    expect(screen.getByRole("button", { name: "移除 甲应用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "移除 丙应用" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "移除 乙应用" })).not.toBeInTheDocument();
  });
});
