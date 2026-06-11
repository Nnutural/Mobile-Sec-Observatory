import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import {
  buildSankeyDataset,
  colorForGroup,
  type SankeyDriftLink,
  type SankeyDriftNode,
} from "@/components/charts/helpers/sankeyDriftHelpers";
import { colors } from "@/design/colors";
import type { AppVersion, PDIData, PermissionsMetadata } from "@/types";
import { useChartSize } from "@/utils/d3Helpers";

// d3-sankey 推荐参数
const NODE_WIDTH = 16;
const NODE_PADDING = 10;
const HEADER_HEIGHT = 32;

export interface SankeyDriftProps {
  appVersions: AppVersion[];
  permissionsMetadata: PermissionsMetadata;
  weights?: PDIData["weights"];
  height?: number;
}

interface SankeyDriftNodeRaw extends SankeyDriftNode {}
interface SankeyDriftLinkRaw extends Omit<SankeyDriftLink, "sourceId" | "targetId"> {
  source: string;
  target: string;
}

type ComputedNode = d3.SimulationNodeDatum & SankeyDriftNodeRaw & {
  x0: number; x1: number; y0: number; y1: number; index: number; sourceLinks: ComputedLink[]; targetLinks: ComputedLink[];
};
type ComputedLink = SankeyDriftLinkRaw & {
  source: ComputedNode; target: ComputedNode; width: number; y0: number; y1: number; index: number;
};

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  link: SankeyDriftLink | null;
  node: SankeyDriftNode | null;
}

export function SankeyDrift({ appVersions, permissionsMetadata, height = 460 }: SankeyDriftProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width } = useChartSize(containerRef, 960);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, link: null, node: null });

  const dataset = useMemo(
    () => buildSankeyDataset(appVersions, permissionsMetadata),
    [appVersions, permissionsMetadata],
  );

  useEffect(() => {
    if (!svgRef.current || width === 0 || dataset.nodes.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const innerTop = HEADER_HEIGHT;
    const innerBottom = height - 8;

    const sankeyLayout = sankey<SankeyDriftNodeRaw, SankeyDriftLinkRaw>()
      .nodeId((node) => node.id)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([[24, innerTop], [width - 24, innerBottom]]);

    const graph: SankeyGraph<SankeyDriftNodeRaw, SankeyDriftLinkRaw> = {
      nodes: dataset.nodes.map((node) => ({ ...node })),
      links: dataset.links.map((link) => ({
        source: link.sourceId,
        target: link.targetId,
        value: link.value,
        added: link.added,
        removed: link.removed,
        isExpansion: link.isExpansion,
      })),
    };
    const computed = sankeyLayout(graph) as unknown as { nodes: ComputedNode[]; links: ComputedLink[] };

    // 版本号列头
    const versionXMap = new Map<string, number>();
    computed.nodes.forEach((node) => {
      const existing = versionXMap.get(node.versionName);
      const midpoint = (node.x0 + node.x1) / 2;
      if (existing === undefined) versionXMap.set(node.versionName, midpoint);
    });
    svg.append("g")
      .selectAll("text.version-header")
      .data(Array.from(versionXMap.entries()))
      .join("text")
      .attr("class", "version-header")
      .attr("x", (d) => d[1])
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", colors.primary[700])
      .text((d) => d[0]);

    // 连接路径
    svg.append("g")
      .attr("fill", "none")
      .selectAll("path.link")
      .data(computed.links)
      .join("path")
      .attr("class", "link")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (d) => (d.isExpansion ? colors.severity.high : colors.primary[300]))
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .attr("opacity", 0.55)
      .style("cursor", "pointer")
      .on("mouseenter", function (event: MouseEvent, d) {
        d3.select(this).attr("opacity", 0.95);
        const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
        const tooltipLink: SankeyDriftLink = {
          sourceId: typeof d.source === "string" ? d.source : (d.source as ComputedNode).id,
          targetId: typeof d.target === "string" ? d.target : (d.target as ComputedNode).id,
          value: d.value,
          added: d.added,
          removed: d.removed,
          isExpansion: d.isExpansion,
        };
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          link: tooltipLink,
          node: null,
        });
      })
      .on("mousemove", function (event: MouseEvent) {
        const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
        setTooltip((current) => ({ ...current, x: event.clientX - rect.left, y: event.clientY - rect.top }));
      })
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.55);
        setTooltip((current) => ({ ...current, visible: false }));
      });

    // 节点矩形（按权限组配色）
    svg.append("g")
      .selectAll("rect.node")
      .data(computed.nodes)
      .join("rect")
      .attr("class", "node")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => Math.max(2, d.y1 - d.y0))
      .attr("fill", (d) => colorForGroup(d.groupId, colors.permission))
      .attr("stroke", colors.gray[700])
      .attr("opacity", 0.95)
      .style("cursor", "pointer")
      .on("mouseenter", (event: MouseEvent, d) => {
        const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
        setTooltip({ visible: true, x: event.clientX - rect.left, y: event.clientY - rect.top, link: null, node: d });
      })
      .on("mouseleave", () => setTooltip((current) => ({ ...current, visible: false })));

    // 节点标签（仅在节点足够高时显示）
    svg.append("g")
      .selectAll("text.node-label")
      .data(computed.nodes.filter((node) => node.y1 - node.y0 >= 10))
      .join("text")
      .attr("class", "node-label")
      .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", (d) => (d.y0 + d.y1) / 2 + 4)
      .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
      .attr("font-size", 11)
      .attr("fill", colors.gray[800])
      .text((d) => `${d.groupLabel} · ${d.permissions.length}`);

    return () => {
      svg.selectAll("*").remove();
    };
  }, [dataset, height, width]);

  if (dataset.nodes.length === 0) {
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
        aria-label="权限组演化桑基图"
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
        {tooltip.link && (
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: colors.gray[900] }}>
              {(tooltip.link.sourceId ?? "").split("__")[0]} →{" "}
              {(tooltip.link.targetId ?? "").split("__")[0]}
            </div>
            {tooltip.link.added.length > 0 && (
              <div>新增：{tooltip.link.added.join("、")}</div>
            )}
            {tooltip.link.removed.length > 0 && (
              <div>移除：{tooltip.link.removed.join("、")}</div>
            )}
            {tooltip.link.isExpansion && (
              <div style={{ color: colors.severity.high }}>同组扩张：是</div>
            )}
          </div>
        )}
        {tooltip.node && (
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: colors.gray[900] }}>
              {tooltip.node.versionName} · {tooltip.node.groupLabel}
            </div>
            <div>权限数：{tooltip.node.permissions.length}</div>
          </div>
        )}
      </ChartTooltip>
    </div>
  );
}
