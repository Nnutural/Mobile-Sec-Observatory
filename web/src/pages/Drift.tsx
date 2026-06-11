import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { PDIDecompositionBar } from "@/components/charts/PDIDecompositionBar";
import { RadarChart, type RadarChartDatum } from "@/components/charts/RadarChart";
import { VersionTimeline, type VersionTimelineItem } from "@/components/charts/VersionTimeline";
import { WeightSlider } from "@/components/charts/WeightSlider";
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

  const requestedApp = searchParams.get("app");
  const selectedBaseResult = pdi?.results.find((result) => result.app_id === requestedApp) ?? pdi?.results[0];
  const selectedAppId = selectedBaseResult?.app_id;
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
      note: "危险",
    }));
    const silentRows = currentTransition.details.silent_expansion_groups.map((group) => ({
      id: `silent-${group}`,
      type: "静默扩张",
      permission: `${group} 权限组`,
      permissionFull: `${group} 权限组`,
      group,
      risk: 0,
      note: "同组追加",
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
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <label className="text-sm font-medium" style={{ color: colors.gray[700] }}>
            应用切换器
          </label>
          <Select
            className="min-w-[320px]"
            value={selectedAppId}
            onChange={(event) => setSearchParams({ app: event.currentTarget.value })}
          >
            {apps.apps.map((app) => (
              <option key={app.id} value={app.id}>
                {(app.name_zh ?? app.name)}（{app.id}）
              </option>
            ))}
          </Select>
          <Button disabled title="阶段 4 上线" variant="outline">
            对比模式
          </Button>
        </CardContent>
      </Card>

      <section className="grid grid-cols-[0.9fr_1.4fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>版本时间轴</CardTitle>
          </CardHeader>
          <CardContent>
            <VersionTimeline
              versions={timelineVersions}
              selectedVersion={selectedVersion}
              onSelect={setSelectedVersion}
              height={390}
            />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>当前版本漂移雷达</CardTitle>
            </CardHeader>
            <CardContent>
              <RadarChart
                data={radarData}
                height={250}
                name={currentTransition ? `${currentTransition.from_version} → ${currentTransition.to_version}` : "PDI 分量"}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>PDI 分量堆叠柱</CardTitle>
            </CardHeader>
            <CardContent>
              <PDIDecompositionBar transition={currentTransition} weights={weights} height={190} />
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardContent
          className="flex h-[260px] items-center justify-center text-center text-sm"
          style={{ color: colors.gray[500] }}
        >
          权限组演化（桑基图）将在阶段 4 实现，届时直接渲染同组扩张证据
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>权限变化明细表</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} rows={changeRows} pageSize={10} searchKeys={["permission", "group"]} />
        </CardContent>
      </Card>

      <section className="grid grid-cols-[1.2fr_260px] gap-6">
        <WeightSlider weights={weights} onChange={setWeights} />
        <Card>
          <CardHeader>
            <CardTitle>实时重算</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div style={{ color: colors.gray[700] }}>当前 PDI = {formatNumber(currentPdi, 4)}</div>
            <div
              style={{
                color: relative >= 0 ? colors.severity.high : colors.severity.low,
              }}
            >
              相对默认权重 {relative >= 0 ? "+" : ""}
              {formatNumber(relative, 2)}%
            </div>
            <div style={{ color: colors.gray[500] }}>
              默认权重基线：{formatNumber(defaultPdi, 4)}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
