import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChartCard } from "@/components/charts/ChartCard";
import { ComboMatrix } from "@/components/charts/ComboMatrix";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { ForceGraph } from "@/components/charts/ForceGraph";
import { PermissionHeatmap, type HeatmapSelection } from "@/components/charts/PermissionHeatmap";
import { StackedBarChart, type StackedBarDatum } from "@/components/charts/StackedBarChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { colors } from "@/design/colors";
import { useAppsWithLatest } from "@/hooks/useDerivedData";
import { useAppVersions, useApps, useCLRI, usePermissionsMetadata } from "@/hooks/useData";
import { formatNumber } from "@/utils/formatters";
import { CATEGORY_ZH_FALLBACK } from "@/utils/i18n";

interface PermissionRow {
  appId: string;
  appName: string;
  packageName: string;
  categoryId: string;
  category: string;
  total: number;
  normal: number;
  dangerous: number;
  signature: number;
  exported: number;
  clri: number;
}

function exportedComponents(row: NonNullable<ReturnType<typeof useAppsWithLatest>[number]["latestVersion"]>): number {
  return (
    row.components.activities.exported +
    row.components.services.exported +
    row.components.receivers.exported +
    row.components.providers.exported
  );
}

export function Permissions() {
  const { data: apps } = useApps();
  const { data: versions } = useAppVersions();
  const { data: clri } = useCLRI();
  const { data: permissionsMetadata } = usePermissionsMetadata();
  const latestRows = useAppsWithLatest();
  const navigate = useNavigate();
  const [category, setCategory] = useState("all");
  const [dangerousMin, setDangerousMin] = useState(0);
  const [query, setQuery] = useState("");
  const [heatmapSelection, setHeatmapSelection] = useState<HeatmapSelection | null>(null);

  const rows: PermissionRow[] = useMemo(
    () =>
      latestRows.map(({ app, latestVersion, clri: appClri }) => ({
        appId: app.id,
        appName: app.name_zh ?? app.name,
        packageName: app.id,
        categoryId: app.category_id,
        category: CATEGORY_ZH_FALLBACK[app.category_id] ?? app.category_zh,
        total: latestVersion?.permission_counts.total ?? 0,
        normal: latestVersion?.permission_counts.normal ?? 0,
        dangerous: latestVersion?.permission_counts.dangerous ?? 0,
        signature: latestVersion?.permission_counts.signature ?? 0,
        exported: latestVersion ? exportedComponents(latestVersion) : 0,
        clri: appClri,
      })),
    [latestRows],
  );

  const categories = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.categoryId))).map((categoryId) => ({
        id: categoryId,
        label: CATEGORY_ZH_FALLBACK[categoryId] ?? categoryId,
      })),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const categoryMatched = category === "all" || row.categoryId === category;
      const dangerousMatched = row.dangerous >= dangerousMin;
      const queryMatched =
        normalizedQuery.length === 0 ||
        row.appName.toLowerCase().includes(normalizedQuery) ||
        row.packageName.toLowerCase().includes(normalizedQuery);
      return categoryMatched && dangerousMatched && queryMatched;
    });
  }, [category, dangerousMin, query, rows]);

  const chartData: StackedBarDatum[] = filteredRows.map((row) => ({
    label: row.appName,
    normal: row.normal,
    dangerous: row.dangerous,
    signature: row.signature,
  }));

  const columns: Array<DataTableColumn<PermissionRow>> = [
    { key: "appName", header: "应用", sortable: true },
    { key: "packageName", header: "包名", sortable: true },
    { key: "category", header: "类别", sortable: true },
    { key: "total", header: "权限总数", sortable: true, align: "right", sortValue: (row) => row.total },
    { key: "dangerous", header: "危险权限", sortable: true, align: "right", sortValue: (row) => row.dangerous },
    { key: "exported", header: "暴露组件", sortable: true, align: "right", sortValue: (row) => row.exported },
    {
      key: "clri",
      header: "CLRI",
      sortable: true,
      align: "right",
      sortValue: (row) => row.clri,
      render: (row) => formatNumber(row.clri, 2),
    },
    {
      key: "action",
      header: "操作",
      render: (row) => (
        <Link
          className="rounded transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
          style={{ color: colors.primary[500], "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
          to={`/drift?app=${encodeURIComponent(row.appId)}`}
        >
          在权限漂移页查看
        </Link>
      ),
    },
  ];

  if (!apps || !versions || !clri || !permissionsMetadata) {
    return <Skeleton className="h-[680px] w-full" />;
  }

  const latestVersionsByApp = new Map<string, (typeof versions.versions)[number]>();
  versions.versions.forEach((version) => {
    const incumbent = latestVersionsByApp.get(version.app_id);
    if (!incumbent || version.release_date > incumbent.release_date) {
      latestVersionsByApp.set(version.app_id, version);
    }
  });
  const latestVersions = Array.from(latestVersionsByApp.values());

  const resetFilters = () => {
    setCategory("all");
    setDangerousMin(0);
    setQuery("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid grid-cols-[180px_240px_1fr_96px] gap-4 pt-6">
          <Select value={category} onChange={(event) => setCategory(event.currentTarget.value)}>
            <option value="all">全部类别</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-3">
            <span className="text-sm" style={{ color: colors.gray[600] }}>
              危险权限下限
            </span>
            <Slider
              min={0}
              max={10}
              step={1}
              value={dangerousMin}
              aria-label="危险权限下限"
              onChange={(event) => setDangerousMin(Number(event.currentTarget.value))}
            />
            <span className="w-6 text-right text-sm" style={{ color: colors.gray[700] }}>
              {dangerousMin}
            </span>
          </label>
          <Input placeholder="搜索应用名 / 包名" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
          <Button variant="outline" onClick={resetFilters}>
            重置
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="heatmap">热力图</TabsTrigger>
          <TabsTrigger value="combo">组合矩阵</TabsTrigger>
          <TabsTrigger value="table">明细表格</TabsTrigger>
          <TabsTrigger value="clri">权限-CVE 关联</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ChartCard title="最新版本权限分布" subtitle="按应用堆叠普通 / 危险 / 签名权限数" exportName="perm_overview">
            <StackedBarChart
              data={chartData}
              stacks={[
                { key: "normal", name: "普通权限", color: colors.primary[300] },
                { key: "dangerous", name: "危险权限", color: colors.severity.high },
                { key: "signature", name: "签名权限", color: colors.permission.contacts },
              ]}
              height={480}
              xAxisLabel="应用"
              yAxisLabel="权限数"
            />
          </ChartCard>
        </TabsContent>
        <TabsContent value="heatmap">
          <ChartCard
            title="权限-类别热力图"
            subtitle="单元格颜色 = 该类别下申请该权限组的应用比例"
            exportName="permission_heatmap"
          >
            <PermissionHeatmap
              versions={latestVersions}
              apps={apps.apps}
              permissionsMetadata={permissionsMetadata}
              selected={heatmapSelection}
              onSelect={setHeatmapSelection}
              height={480}
            />
          </ChartCard>
        </TabsContent>
        <TabsContent value="combo">
          <ChartCard
            title="网络-敏感权限组合矩阵"
            subtitle="每条连线表示同时声明网络权限与敏感权限的应用"
            exportName="combo_matrix"
          >
            <ComboMatrix
              versions={latestVersions}
              apps={apps.apps}
              height={520}
              onSelectApp={(appId) => navigate(`/drift?app=${encodeURIComponent(appId)}`)}
            />
          </ChartCard>
        </TabsContent>
        <TabsContent value="table">
          <ChartCard
            title="权限明细表"
            subtitle={
              heatmapSelection
                ? `已通过热力图筛选：${heatmapSelection.group} / ${heatmapSelection.category}`
                : `当前显示 ${formatNumber(filteredRows.length)} 个应用`
            }
            exportName="perm_table"
          >
            <DataTable
              columns={columns}
              rows={
                heatmapSelection
                  ? filteredRows.filter((row) => row.categoryId === heatmapSelection.category)
                  : filteredRows
              }
              pageSize={10}
              searchPlaceholder="搜索应用名 / 包名"
              searchKeys={["appName", "packageName"]}
              caption={`当前显示 ${formatNumber(filteredRows.length)} 个应用`}
            />
          </ChartCard>
        </TabsContent>
        <TabsContent value="clri">
          <ChartCard
            title="权限-CVE 关联力导向图"
            subtitle="边粗细 = ρ × 严重等级；颜色按 CVE 严重等级"
            exportName="force_graph"
          >
            <ForceGraph clri={clri} height={520} />
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
