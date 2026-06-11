import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { colors } from "@/design/colors";
import type { App, AppVersion, PermissionsMetadata } from "@/types";
import { useChartSize } from "@/utils/d3Helpers";
import { formatPercent } from "@/utils/formatters";
import { CATEGORY_ZH_FALLBACK } from "@/utils/i18n";

// 5 个目标应用类别（按方案 §4.3.3）
const CATEGORY_ORDER: ReadonlyArray<{ id: string; label: string }> = [
  { id: "Development", label: "开发工具" },
  { id: "Internet", label: "通信" },
  { id: "Multimedia", label: "媒体" },
  { id: "Navigation", label: "位置导航" },
  { id: "Reading", label: "阅读" },
];

// 行末尾迷你 bar 的宽度（px），与图表分离
const MINI_BAR_WIDTH = 80;
// 行高，足以承载中文权限组名
const ROW_HEIGHT = 36;
// 列头预留高度（X 轴标签）
const HEADER_HEIGHT = 56;
// 左侧 Y 轴标签宽度
const LABEL_WIDTH = 130;

export interface HeatmapSelection {
  group: string;
  category: string;
}

export interface PermissionHeatmapProps {
  versions: AppVersion[];
  apps: App[];
  permissionsMetadata: PermissionsMetadata;
  height?: number;
  selected?: HeatmapSelection | null;
  onSelect?: (selection: HeatmapSelection | null) => void;
}

interface HeatCell {
  groupId: string;
  categoryId: string;
  ratio: number;
  appsWithGroup: number;
  totalApps: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: HeatCell | null;
}

function buildCells(
  versions: AppVersion[],
  apps: App[],
  permissionsMetadata: PermissionsMetadata,
): { cells: HeatCell[]; groups: Array<{ id: string; label: string }> } {
  const groups = Object.values(permissionsMetadata.groups).map((group) => ({
    id: group.id,
    label: group.name_zh,
  }));

  const permissionToGroup = new Map<string, string>();
  Object.values(permissionsMetadata.permissions).forEach((permission) => {
    if (permission.group) permissionToGroup.set(permission.name, permission.group);
  });

  const latestByApp = new Map<string, AppVersion>();
  versions.forEach((version) => {
    const incumbent = latestByApp.get(version.app_id);
    if (!incumbent || version.release_date > incumbent.release_date) {
      latestByApp.set(version.app_id, version);
    }
  });

  const appsByCategory = new Map<string, string[]>();
  apps.forEach((app) => {
    const list = appsByCategory.get(app.category_id) ?? [];
    list.push(app.id);
    appsByCategory.set(app.category_id, list);
  });

  const cells: HeatCell[] = [];
  groups.forEach((group) => {
    CATEGORY_ORDER.forEach((category) => {
      const appIds = appsByCategory.get(category.id) ?? [];
      const totalApps = appIds.length;
      let appsWithGroup = 0;
      appIds.forEach((appId) => {
        const latest = latestByApp.get(appId);
        if (!latest) return;
        const hasGroup = latest.permissions.all.some((permission) => permissionToGroup.get(permission) === group.id);
        if (hasGroup) appsWithGroup += 1;
      });
      const ratio = totalApps === 0 ? 0 : appsWithGroup / totalApps;
      cells.push({ groupId: group.id, categoryId: category.id, ratio, appsWithGroup, totalApps });
    });
  });

  return { cells, groups };
}

export function PermissionHeatmap({
  versions,
  apps,
  permissionsMetadata,
  height = 480,
  selected,
  onSelect,
}: PermissionHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width } = useChartSize(containerRef, 800);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, content: null });

  const { cells, groups } = useMemo(
    () => buildCells(versions, apps, permissionsMetadata),
    [versions, apps, permissionsMetadata],
  );

  const groupAverage = useMemo(() => {
    const map = new Map<string, number>();
    groups.forEach((group) => {
      const list = cells.filter((cell) => cell.groupId === group.id);
      const total = list.reduce((sum, cell) => sum + cell.ratio, 0);
      map.set(group.id, list.length === 0 ? 0 : total / list.length);
    });
    return map;
  }, [cells, groups]);

  useEffect(() => {
    if (!svgRef.current || width === 0 || groups.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const matrixWidth = width - LABEL_WIDTH - MINI_BAR_WIDTH - 20;
    if (matrixWidth <= 0) return;
    const matrixHeight = groups.length * ROW_HEIGHT;
    svg.attr("viewBox", `0 0 ${width} ${HEADER_HEIGHT + matrixHeight + 24}`);

    const xScale = d3.scaleBand<string>()
      .domain(CATEGORY_ORDER.map((category) => category.id))
      .range([LABEL_WIDTH, LABEL_WIDTH + matrixWidth])
      .paddingInner(0.08);
    const yScale = d3.scaleBand<string>()
      .domain(groups.map((group) => group.id))
      .range([HEADER_HEIGHT, HEADER_HEIGHT + matrixHeight])
      .paddingInner(0.12);
    const colorScale = d3.scaleSequential<string, string>(d3.interpolateBlues).domain([0, 1]);

    const root = svg.append("g");

    // 列头
    root.append("g")
      .selectAll("text.x-label")
      .data(CATEGORY_ORDER)
      .join("text")
      .attr("class", "x-label")
      .attr("x", (d) => (xScale(d.id) ?? 0) + xScale.bandwidth() / 2)
      .attr("y", HEADER_HEIGHT - 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", colors.gray[700])
      .text((d) => d.label);

    // 行标签
    root.append("g")
      .selectAll("text.y-label")
      .data(groups)
      .join("text")
      .attr("class", "y-label")
      .attr("x", LABEL_WIDTH - 8)
      .attr("y", (d) => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2 + 4)
      .attr("text-anchor", "end")
      .attr("font-size", 12)
      .attr("fill", colors.gray[700])
      .text((d) => d.label);

    // 网格单元
    root.append("g")
      .selectAll("rect.cell")
      .data(cells)
      .join("rect")
      .attr("class", "cell")
      .attr("x", (d) => xScale(d.categoryId) ?? 0)
      .attr("y", (d) => yScale(d.groupId) ?? 0)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => colorScale(d.ratio))
      .attr("stroke", (d) =>
        selected && selected.group === d.groupId && selected.category === d.categoryId
          ? colors.primary[700]
          : colors.gray[200],
      )
      .attr("stroke-width", (d) =>
        selected && selected.group === d.groupId && selected.category === d.categoryId ? 2 : 1,
      )
      .style("cursor", "pointer")
      .attr("tabindex", 0)
      .on("mousemove", (event: MouseEvent, d) => {
        const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
        setTooltip({ visible: true, x: event.clientX - rect.left, y: event.clientY - rect.top, content: d });
      })
      .on("mouseleave", () => setTooltip((current) => ({ ...current, visible: false })))
      .on("click", (_: MouseEvent, d) => onSelect?.({ group: d.groupId, category: d.categoryId }))
      .on("keydown", function (event: KeyboardEvent, d) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.({ group: d.groupId, category: d.categoryId });
        }
      });

    // 数字标注：比例 ≥ 0.1 时显示
    root.append("g")
      .selectAll("text.cell-value")
      .data(cells.filter((d) => d.ratio >= 0.1))
      .join("text")
      .attr("class", "cell-value")
      .attr("x", (d) => (xScale(d.categoryId) ?? 0) + xScale.bandwidth() / 2)
      .attr("y", (d) => (yScale(d.groupId) ?? 0) + yScale.bandwidth() / 2 + 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", (d) => (d.ratio > 0.6 ? colors.gradient.diverging[2] : colors.gray[900]))
      .text((d) => formatPercent(d.ratio, 0));

    // 行末迷你 bar
    const barStart = LABEL_WIDTH + matrixWidth + 12;
    const barScale = d3.scaleLinear().domain([0, 1]).range([0, MINI_BAR_WIDTH - 8]);
    const miniBars = root.append("g");
    miniBars.selectAll("rect.mini-track")
      .data(groups)
      .join("rect")
      .attr("class", "mini-track")
      .attr("x", barStart)
      .attr("y", (d) => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2 - 5)
      .attr("width", MINI_BAR_WIDTH - 8)
      .attr("height", 10)
      .attr("rx", 4)
      .attr("fill", colors.gray[100]);
    miniBars.selectAll("rect.mini-bar")
      .data(groups)
      .join("rect")
      .attr("class", "mini-bar")
      .attr("x", barStart)
      .attr("y", (d) => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2 - 5)
      .attr("width", (d) => barScale(groupAverage.get(d.id) ?? 0))
      .attr("height", 10)
      .attr("rx", 4)
      .attr("fill", colors.primary[500]);
    miniBars.selectAll("text.mini-text")
      .data(groups)
      .join("text")
      .attr("class", "mini-text")
      .attr("x", barStart + MINI_BAR_WIDTH - 4)
      .attr("y", (d) => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2 + 4)
      .attr("text-anchor", "end")
      .attr("font-size", 10)
      .attr("fill", colors.gray[600])
      .text((d) => formatPercent(groupAverage.get(d.id) ?? 0, 0));

    return () => {
      svg.selectAll("*").remove();
    };
  }, [cells, groupAverage, groups, onSelect, selected, width]);

  if (cells.length === 0 || groups.length === 0 || apps.length === 0 || versions.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex w-full items-center justify-center rounded-md text-sm"
        style={{ minHeight: height, backgroundColor: colors.gray[50], color: colors.gray[500] }}
      >
        暂无数据
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label="权限-类别热力图"
        className="block w-full"
        style={{ maxHeight: height }}
      />
      <ChartTooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        containerWidth={width}
        containerHeight={height}
      >
        {tooltip.content && (
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: colors.gray[900] }}>
              {permissionsMetadata.groups[tooltip.content.groupId]?.name_zh ?? tooltip.content.groupId}
              {" / "}
              {CATEGORY_ZH_FALLBACK[tooltip.content.categoryId] ?? tooltip.content.categoryId}
            </div>
            <div>申请应用数：{tooltip.content.appsWithGroup} / {tooltip.content.totalApps}</div>
            <div>比例：{formatPercent(tooltip.content.ratio, 0)}</div>
          </div>
        )}
      </ChartTooltip>
    </div>
  );
}
