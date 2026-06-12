import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { DriftCompareView } from "@/components/charts/DriftCompareView";
import { useExportMode } from "@/components/charts/ExportMode";
import { PDIDecompositionBar } from "@/components/charts/PDIDecompositionBar";
import { RadarChart, type RadarChartDatum } from "@/components/charts/RadarChart";
import { SankeyDrift } from "@/components/charts/SankeyDrift";
import { VersionTimeline, type VersionTimelineItem } from "@/components/charts/VersionTimeline";
import { WeightSlider } from "@/components/charts/WeightSlider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { usePDIRecomputed, type PDIWeights } from "@/hooks/useDerivedData";
import { useAppVersions, useApps, usePDI, usePermissionsMetadata } from "@/hooks/useData";
import type { PDITransition } from "@/types";
import { formatNumber, truncateMid } from "@/utils/formatters";

interface ChangeRow {
  id: string;
  type: string;
  permission: string;
  permissionFull: string;
  group: string;
  risk: number;
  note: string;
}

const defaultWeights: PDIWeights = { alpha: 0.3, beta: 0.4, gamma: 0.2, delta: 0.1 };

function transitionPDI(transition: PDITransition, weights: PDIWeights): number {
  return (
    weights.alpha * transition.components.delta_d +
    weights.beta * transition.components.delta_s +
    weights.gamma * transition.components.delta_c +
    weights.delta * transition.components.delta_e
  );
}

export function Drift() {
  const { data: apps } = useApps();
  const { data: pdi } = usePDI();
  const { data: versions } = useAppVersions();
  const { data: metadata } = usePermissionsMetadata();
  const exportMode = useExportMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weights, setWeights] = useState<PDIWeights>(defaultWeights);
  const [weightsInitialized, setWeightsInitialized] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>();

  useEffect(() => {
    if (pdi && !weightsInitialized) {
      setWeights(pdi.weights);
      setWeightsInitialized(true);
    }
  }, [pdi, weightsInitialized]);

  const validAppIds = useMemo(() => apps?.apps.map((app) => app.id) ?? [], [apps]);
  const mode: "single" | "compare" = searchParams.has("apps") ? "compare" : "single";
  const requestedApp = searchParams.get("app");
  const requestedCompareIds = useMemo(
    () =>
      (searchParams.get("apps") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => validAppIds.includes(item))
        .slice(0, 3),
    [searchParams, validAppIds],
  );

  const selectedBaseResult = pdi?.results.find((result) => result.app_id === requestedApp) ?? pdi?.results[0];
  const selectedAppId = selectedBaseResult?.app_id;
  const compareAppIds = requestedCompareIds.length > 0 ? requestedCompareIds : selectedAppId ? [selectedAppId] : [];
  const exportCompareAppIds = validAppIds.slice(0, 3);
  const renderedCompareAppIds = exportMode && exportCompareAppIds.length > 0 ? exportCompareAppIds : compareAppIds;
  const recomputedResults = usePDIRecomputed(weights, selectedAppId);
  const selectedResult = recomputedResults[0] ?? selectedBaseResult;

  const appVersions = useMemo(
    () =>
      versions?.versions
        .filter((version) => version.app_id === selectedAppId)
        .sort((a, b) => a.release_date.localeCompare(b.release_date) || a.version_code - b.version_code) ?? [],
    [selectedAppId, versions],
  );

  useEffect(() => {
    const preferred = selectedResult?.drift_sequence[0]?.to_version ?? appVersions[0]?.version_name;
    if (preferred && !appVersions.some((version) => version.version_name === selectedVersion)) {
      setSelectedVersion(preferred);
    }
  }, [appVersions, selectedResult, selectedVersion]);

  const switchMode = (nextMode: "single" | "compare") => {
    if (nextMode === "single") {
      setSearchParams({ app: compareAppIds[0] ?? selectedAppId ?? validAppIds[0] ?? "" });
    } else {
      const initial = selectedAppId ?? validAppIds[0];
      if (initial) setSearchParams({ apps: initial });
    }
  };

  const setSingleApp = (appId: string) => setSearchParams({ app: appId });
  const setCompareApps = (appIds: string[]) => {
    const next = appIds.filter((appId, index, array) => validAppIds.includes(appId) && array.indexOf(appId) === index).slice(0, 3);
    if (next.length > 0) setSearchParams({ apps: next.join(",") });
  };

  const appNameById = useMemo(
    () => new Map(apps?.apps.map((app) => [app.id, app.name_zh ?? app.name]) ?? []),
    [apps],
  );

  const currentTransition =
    selectedResult?.drift_sequence.find((transition) => transition.to_version === selectedVersion) ??
    selectedResult?.drift_sequence[0];
  const defaultTransition =
    selectedBaseResult?.drift_sequence.find((transition) => transition.to_version === selectedVersion) ??
    selectedBaseResult?.drift_sequence[0];

  const timelineVersions: VersionTimelineItem[] = useMemo(
    () =>
      appVersions.map((version) => {
        const transition = selectedResult?.drift_sequence.find((item) => item.to_version === version.version_name);
        return {
          version_name: version.version_name,
          release_date: version.release_date,
          pdi: transition?.pdi,
          silentExpansion: transition?.details.silent_expansion_groups,
        };
      }),
    [appVersions, selectedResult],
  );

  const maxComponent = useMemo(() => {
    const values = selectedResult?.drift_sequence.flatMap((transition) => Object.values(transition.components)) ?? [];
    return Math.max(...values, 1);
  }, [selectedResult]);

  const radarData: RadarChartDatum[] = currentTransition
    ? [
        { axis: "ΔD", value: currentTransition.components.delta_d, fullMark: maxComponent },
        { axis: "ΔS", value: currentTransition.components.delta_s, fullMark: maxComponent },
        { axis: "ΔC", value: currentTransition.components.delta_c, fullMark: maxComponent },
        { axis: "ΔE", value: currentTransition.components.delta_e, fullMark: maxComponent },
      ]
    : [];

  const changeRows: ChangeRow[] = useMemo(() => {
    if (!currentTransition || !metadata) return [];
    const dangerousRows = currentTransition.details.new_dangerous_permissions.map((permission) => ({
      id: `new-${permission}`,
      type: "新增",
      permission,
      permissionFull: permission,
      group: metadata.permissions[permission]?.group ?? "UNKNOWN",
      risk: metadata.permissions[permission]?.weight ?? 0,
      note: "危险权限",
    }));
    const silentRows = currentTransition.details.silent_expansion_groups.map((group) => ({
      id: `silent-${group}`,
      type: "同组扩张",
      permission: `${group} 权限组`,
      permissionFull: `${group} 权限组`,
      group,
      risk: 0,
      note: "ΔS",
    }));
    const removedRows = currentTransition.details.removed_permissions.map((permission) => ({
      id: `removed-${permission}`,
      type: "移除",
      permission,
      permissionFull: permission,
      group: metadata.permissions[permission]?.group ?? "UNKNOWN",
      risk: metadata.permissions[permission]?.weight ?? 0,
      note: "删除",
    }));
    return [...dangerousRows, ...silentRows, ...removedRows];
  }, [currentTransition, metadata]);

  const currentPdi = useMemo(() => (currentTransition ? transitionPDI(currentTransition, weights) : 0), [currentTransition, weights]);
  const defaultPdi = defaultTransition?.pdi ?? 0;
  const relative = defaultPdi === 0 ? 0 : ((currentPdi - defaultPdi) / Math.abs(defaultPdi)) * 100;

  const columns: Array<DataTableColumn<ChangeRow>> = [
    { key: "type", header: "类型", sortable: true },
    {
      key: "permission",
      header: "权限",
      render: (row) => <span title={row.permissionFull}>{truncateMid(row.permission, 30)}</span>,
      sortable: true,
    },
    { key: "group", header: "权限组", sortable: true },
    {
      key: "risk",
      header: "风险权重",
      align: "right",
      sortable: true,
      sortValue: (row) => row.risk,
      render: (row) => formatNumber(row.risk, 2),
    },
    { key: "note", header: "备注", sortable: true },
  ];

  if (!apps || !pdi || !versions || !metadata || !selectedResult || !selectedAppId) {
    return <Skeleton className="h-[760px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card id="selector">
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <label className="text-sm font-medium" style={{ color: colors.gray[700] }}>
            应用切换器
          </label>
          <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: colors.gray[300] }}>
            <Button type="button" variant={mode === "single" ? "default" : "ghost"} onClick={() => switchMode("single")}>
              单应用模式
            </Button>
            <Button type="button" variant={mode === "compare" ? "default" : "ghost"} onClick={() => switchMode("compare")}>
              对比模式
            </Button>
          </div>

          {mode === "single" ? (
            <Select className="min-w-[320px]" value={selectedAppId} onChange={(event) => setSingleApp(event.currentTarget.value)}>
              {apps.apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {(app.name_zh ?? app.name)}（{app.id}）
                </option>
              ))}
            </Select>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {compareAppIds.map((appId) => (
                <Badge key={appId} variant="outline" className="gap-1 py-1">
                  <span>{appNameById.get(appId) ?? appId}</span>
                  <button
                    type="button"
                    disabled={compareAppIds.length <= 1}
                    onClick={() => setCompareApps(compareAppIds.filter((item) => item !== appId))}
                    aria-label={`移除 ${appNameById.get(appId) ?? appId}`}
                  >
                    <X size={12} aria-hidden />
                  </button>
                </Badge>
              ))}
              <Select
                aria-label="添加对比应用"
                className="min-w-[240px]"
                value=""
                disabled={compareAppIds.length >= 3}
                onChange={(event) => {
                  if (event.currentTarget.value) setCompareApps([...compareAppIds, event.currentTarget.value]);
                }}
              >
                <option value="">{compareAppIds.length >= 3 ? "最多选择 3 个应用" : "添加应用"}</option>
                {apps.apps
                  .filter((app) => !compareAppIds.includes(app.id))
                  .map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name_zh ?? app.name}
                    </option>
                  ))}
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {(exportMode || mode === "single") && (
        <>
          <section id="timeline" className="grid grid-cols-[0.9fr_1.4fr] gap-6">
            <ChartCard title="版本时间轴" exportName="drift_timeline">
              <VersionTimeline
                versions={timelineVersions}
                selectedVersion={selectedVersion}
                onSelect={setSelectedVersion}
                height={390}
              />
            </ChartCard>
            <div className="space-y-4">
              <ChartCard
                title="当前版本漂移雷达"
                subtitle={currentTransition ? `${currentTransition.from_version} → ${currentTransition.to_version}` : "PDI 分量"}
                exportName="drift_radar"
              >
                <RadarChart
                  data={radarData}
                  height={250}
                  name={currentTransition ? `${currentTransition.from_version} → ${currentTransition.to_version}` : "PDI 分量"}
                />
              </ChartCard>
              <ChartCard title="PDI 分量堆叠柱" exportName="pdi_decomp">
                <PDIDecompositionBar transition={currentTransition} weights={weights} height={190} />
              </ChartCard>
            </div>
          </section>

          <ChartCard
            title="权限组演化桑基图"
            subtitle="连接表示相邻版本之间的权限组变化，同组扩张对应 ΔS 分量"
            exportName="sankey_drift"
          >
            <SankeyDrift appVersions={appVersions} permissionsMetadata={metadata} weights={weights} height={420} />
          </ChartCard>

          <Card>
            <CardHeader>
              <CardTitle>权限变化明细表</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} rows={changeRows} pageSize={10} searchKeys={["permission", "group"]} />
            </CardContent>
          </Card>

          <section id="weights" className="grid grid-cols-[1.2fr_260px] gap-6">
            <WeightSlider weights={weights} onChange={setWeights} />
            <Card>
              <CardHeader>
                <CardTitle>实时重算</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div style={{ color: colors.gray[700] }}>当前 PDI = {formatNumber(currentPdi, 4)}</div>
                <div style={{ color: relative >= 0 ? colors.severity.high : colors.severity.low }}>
                  相对默认权重 {relative >= 0 ? "+" : ""}
                  {formatNumber(relative, 2)}%
                </div>
                <div style={{ color: colors.gray[500] }}>默认权重基线：{formatNumber(defaultPdi, 4)}</div>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {(exportMode || mode === "compare") && (
        <>
          <DriftCompareView
            appIds={renderedCompareAppIds}
            pdi={pdi}
            versions={versions}
            apps={apps}
            permissionsMetadata={metadata}
            weights={weights}
          />
          <section id="weights" className="grid grid-cols-[1fr_260px] gap-6">
            <WeightSlider weights={weights} onChange={setWeights} />
            <Card>
              <CardHeader>
                <CardTitle>对比权重</CardTitle>
              </CardHeader>
              <CardContent className="text-sm" style={{ color: colors.gray[600] }}>
                当前权重会实时重算趋势线与排行榜中的 β·ΔS 占比。
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
