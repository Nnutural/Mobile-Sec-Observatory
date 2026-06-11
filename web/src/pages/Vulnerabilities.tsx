import { useEffect, useMemo, useState } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { LineTrendChart, type LineTrendDatum } from "@/components/charts/LineTrendChart";
import { PieChart, type PieChartDatum } from "@/components/charts/PieChart";
import { StackedBarChart, type StackedBarDatum } from "@/components/charts/StackedBarChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useVulnFiltered, type VulnFilters } from "@/hooks/useDerivedData";
import { useVulnerabilities } from "@/hooks/useData";
import type { Vulnerability } from "@/types";
import { formatDate, formatNumber } from "@/utils/formatters";
import { COMPONENT_CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_ORDER, severityColor } from "@/utils/i18n";

const severityKey = {
  Critical: "critical",
  High: "high",
  Moderate: "moderate",
  Low: "low",
} as const;

const componentOrder = ["Framework", "System", "Media", "Kernel", "Vendor"] as const;
const typeOrder = ["RCE", "EoP", "ID", "DoS"] as const;

type ComponentFilter = Vulnerability["component_category"] | "all";
type TypeFilter = Vulnerability["type"] | "all";

interface FilterState extends VulnFilters {
  startMonth: string;
  endMonth: string;
  severities: Vulnerability["severity"][];
  componentCategory: ComponentFilter;
  type: TypeFilter;
}

function makeEmptyTrend(month: string): LineTrendDatum {
  return { month, critical: 0, high: 0, moderate: 0, low: 0 };
}

function buildTrend(rows: Vulnerability[]): LineTrendDatum[] {
  const byMonth = new Map<string, LineTrendDatum>();
  rows.forEach((row) => {
    const month = row.bulletin_date.slice(0, 7);
    const item = byMonth.get(month) ?? makeEmptyTrend(month);
    const key = severityKey[row.severity];
    item[key] = Number(item[key]) + 1;
    byMonth.set(month, item);
  });
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function buildComponentBars(rows: Vulnerability[]): StackedBarDatum[] {
  return componentOrder.map((category) => {
    const item: StackedBarDatum = {
      label: COMPONENT_CATEGORY_LABEL[category],
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
    };
    rows
      .filter((row) => row.component_category === category)
      .forEach((row) => {
        const key = severityKey[row.severity];
        item[key] = Number(item[key]) + 1;
      });
    return item;
  });
}

function buildPie(rows: Vulnerability[]): PieChartDatum[] {
  return SEVERITY_ORDER.map((severity) => ({
    name: SEVERITY_LABEL[severity],
    value: rows.filter((row) => row.severity === severity).length,
    color: severityColor(severity),
  }));
}

function Heatmap({
  rows,
  onSelect,
}: {
  rows: Vulnerability[];
  onSelect: (component: Vulnerability["component_category"], type: Exclude<Vulnerability["type"], "N/A">) => void;
}) {
  const counts = componentOrder.flatMap((component) =>
    typeOrder.map((type) => ({
      component,
      type,
      count: rows.filter((row) => row.component_category === component && row.type === type).length,
    })),
  );
  const max = Math.max(...counts.map((item) => item.count), 1);

  return (
    <ChartCard
      title="Type × Component 热力图"
      subtitle="按漏洞类型与组件类别交叉计数"
      exportName="vuln_type_component"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-xs" style={{ color: colors.gray[600] }}>
          <span>色阶</span>
          <span className="flex overflow-hidden rounded border" style={{ borderColor: colors.gray[200] }}>
            {colors.gradient.blue.map((color) => (
              <span key={color} className="h-3 w-8" style={{ backgroundColor: color }} />
            ))}
          </span>
          <span>0 → {formatNumber(max)}</span>
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${typeOrder.length}, minmax(80px, 1fr))` }}>
          <div />
          {typeOrder.map((type) => (
            <div key={type} className="text-center text-sm font-medium" style={{ color: colors.gray[700] }}>
              {type}
            </div>
          ))}
          {componentOrder.map((component) => (
            <>
              <div key={`${component}-label`} className="flex items-center text-sm font-medium" style={{ color: colors.gray[700] }}>
                {COMPONENT_CATEGORY_LABEL[component]}
              </div>
              {typeOrder.map((type) => {
                const count = counts.find((item) => item.component === component && item.type === type)?.count ?? 0;
                const colorIndex = count === 0 ? 0 : Math.ceil((count / max) * (colors.gradient.blue.length - 1));
                return (
                  <button
                    key={`${component}-${type}`}
                    className="min-h-12 rounded-sm border text-sm font-semibold transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: colors.gradient.blue[colorIndex],
                      borderColor: colors.gray[200],
                      color: colorIndex > 3 ? colors.gradient.diverging[2] : colors.gray[900],
                      "--tw-ring-color": colors.primary[500],
                    } as React.CSSProperties}
                    type="button"
                    title={`${COMPONENT_CATEGORY_LABEL[component]} / ${type}：${count} 条 CVE`}
                    onClick={() => onSelect(component, type)}
                  >
                    {formatNumber(count)}
                  </button>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

export function Vulnerabilities() {
  const { data } = useVulnerabilities();
  const [rangeInitialized, setRangeInitialized] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    startMonth: "",
    endMonth: "",
    severities: [...SEVERITY_ORDER],
    componentCategory: "all",
    type: "all",
  });
  const filteredRows = useVulnFiltered(filters);

  useEffect(() => {
    if (data && !rangeInitialized) {
      setFilters((current) => ({
        ...current,
        startMonth: data.time_range.start,
        endMonth: data.time_range.end,
      }));
      setRangeInitialized(true);
    }
  }, [data, rangeInitialized]);

  const trendSeries = SEVERITY_ORDER.map((severity) => ({
    key: severityKey[severity],
    name: SEVERITY_LABEL[severity],
    color: severityColor(severity),
  }));

  const trendData = useMemo(() => buildTrend(filteredRows), [filteredRows]);
  const componentBars = useMemo(() => buildComponentBars(filteredRows), [filteredRows]);
  const severityPie = useMemo(() => buildPie(filteredRows), [filteredRows]);

  const tableColumns: Array<DataTableColumn<Vulnerability>> = [
    { key: "cve_id", header: "CVE ID", sortable: true },
    { key: "bulletin_date", header: "公告日期", render: (row) => formatDate(row.bulletin_date), sortable: true },
    {
      key: "severity",
      header: "严重等级",
      render: (row) => (
        <Badge
          style={{
            "--mso-badge-bg": severityColor(row.severity),
            "--mso-badge-fg": colors.gradient.diverging[2],
          } as React.CSSProperties}
        >
          {SEVERITY_LABEL[row.severity]}
        </Badge>
      ),
      sortable: true,
      sortValue: (row) => SEVERITY_ORDER.indexOf(row.severity),
    },
    { key: "type", header: "Type", sortable: true },
    {
      key: "component_category",
      header: "组件类别",
      render: (row) => COMPONENT_CATEGORY_LABEL[row.component_category],
      sortable: true,
    },
    { key: "affected_versions", header: "受影响版本", render: (row) => row.affected_versions.join(" / ") },
    { key: "vendor", header: "厂商", sortable: true },
    {
      key: "bulletin_url",
      header: "链接",
      render: (row) => (
        <a
          className="rounded transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
          href={row.bulletin_url}
          rel="noreferrer"
          style={{ color: colors.primary[500], "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
          target="_blank"
        >
          查看
        </a>
      ),
    },
  ];

  if (!data) {
    return <Skeleton className="h-[760px] w-full" />;
  }

  const resetFilters = () => {
    setFilters({
      startMonth: data.time_range.start,
      endMonth: data.time_range.end,
      severities: [...SEVERITY_ORDER],
      componentCategory: "all",
      type: "all",
    });
  };

  const toggleSeverity = (severity: Vulnerability["severity"]) => {
    setFilters((current) => ({
      ...current,
      severities: current.severities.includes(severity)
        ? current.severities.filter((item) => item !== severity)
        : [...current.severities, severity],
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid grid-cols-[1fr_1.4fr_180px_96px] gap-4 pt-6">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm" style={{ color: colors.gray[600] }}>
              起始月份
              <Input
                className="mt-1"
                type="month"
                value={filters.startMonth}
                onChange={(event) => setFilters((current) => ({ ...current, startMonth: event.currentTarget.value }))}
              />
            </label>
            <label className="text-sm" style={{ color: colors.gray[600] }}>
              结束月份
              <Input
                className="mt-1"
                type="month"
                value={filters.endMonth}
                onChange={(event) => setFilters((current) => ({ ...current, endMonth: event.currentTarget.value }))}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {SEVERITY_ORDER.map((severity) => (
              <label key={severity} className="flex items-center gap-2 text-sm" style={{ color: colors.gray[700] }}>
                <input
                  checked={filters.severities.includes(severity)}
                  type="checkbox"
                  onChange={() => toggleSeverity(severity)}
                />
                {SEVERITY_LABEL[severity]}
              </label>
            ))}
          </div>
          <Select
            value={filters.componentCategory}
            onChange={(event) =>
              setFilters((current) => ({ ...current, componentCategory: event.currentTarget.value as ComponentFilter }))
            }
          >
            <option value="all">全部组件</option>
            {componentOrder.map((component) => (
              <option key={component} value={component}>
                {COMPONENT_CATEGORY_LABEL[component]}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={resetFilters}>
            重置
          </Button>
        </CardContent>
      </Card>

      <ChartCard title="月度趋势" subtitle="按公告月份统计 CVE 数量" exportName="vuln_trend">
        <LineTrendChart data={trendData} series={trendSeries} height={320} mode="line" />
      </ChartCard>

      <section className="grid grid-cols-2 gap-6">
        <ChartCard title="组件类别分布" subtitle="按组件大类堆叠不同严重等级" exportName="vuln_component">
          <StackedBarChart
            data={componentBars}
            stacks={SEVERITY_ORDER.map((severity) => ({
              key: severityKey[severity],
              name: SEVERITY_LABEL[severity],
              color: severityColor(severity),
            }))}
            height={300}
            xAxisLabel="组件类别"
            yAxisLabel="漏洞数"
            labelFormatter={(label) => `组件类别：${label}`}
          />
        </ChartCard>
        <ChartCard title="严重等级占比" subtitle="筛选范围内的严重等级分布" exportName="vuln_severity_pie">
          <PieChart data={severityPie} height={300} />
        </ChartCard>
      </section>

      <Heatmap
        rows={data.vulnerabilities}
        onSelect={(component, type) => setFilters((current) => ({ ...current, componentCategory: component, type }))}
      />

      <ChartCard
        title="CVE 明细表"
        subtitle={`当前筛选：${formatNumber(filteredRows.length)} / ${formatNumber(data.total_count)} 条`}
        exportName="vuln_table"
      >
        <DataTable
          columns={tableColumns}
          rows={filteredRows}
          pageSize={10}
          searchPlaceholder="搜索 CVE ID / 组件"
          searchKeys={["cve_id", "component"]}
          initialSort={{ key: "bulletin_date", direction: "desc" }}
          caption={`当前筛选：${formatNumber(filteredRows.length)} / ${formatNumber(data.total_count)} 条`}
        />
      </ChartCard>
    </div>
  );
}
