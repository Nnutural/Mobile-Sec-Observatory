import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import {
  buildForceDataset,
  type ForceLink,
  type ForceNode,
} from "@/components/charts/helpers/forceGraphHelpers";
import { colors } from "@/design/colors";
import type { CLRIData, Vulnerability } from "@/types";
import { useChartSize } from "@/utils/d3Helpers";
import { severityColor } from "@/utils/i18n";

// 三栏 X 锚点（百分比），左中右
const COLUMN_X = [0.18, 0.5, 0.82] as const;
// 力学参数（alphaDecay 必须 >= 0.05，否则会一直抖动）
const ALPHA_DECAY = 0.06;
const FORCE_LINK_DISTANCE = 110;
const FORCE_LINK_STRENGTH = 0.55;
const FORCE_X_STRENGTH = 0.55;
const FORCE_Y_STRENGTH = 0.06;
const FORCE_CHARGE = -180;
const FORCE_COLLIDE_PADDING = 4;

export interface ForceGraphProps {
  clri: CLRIData;
  height?: number;
  topPermPerApp?: number;
  topCvePerPerm?: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  node: ForceNode | null;
}

export function ForceGraph({ clri, height = 520, topPermPerApp = 5, topCvePerPerm = 3 }: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width } = useChartSize(containerRef, 960);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, node: null });

  const dataset = useMemo(
    () => buildForceDataset(clri, topPermPerApp, topCvePerPerm),
    [clri, topCvePerPerm, topPermPerApp],
  );

  useEffect(() => {
    if (!svgRef.current || width === 0 || dataset.nodes.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const nodes = dataset.nodes.map((node) => ({ ...node }));
    const links = dataset.links.map((link) => ({ ...link }));

    const xByKind = (node: ForceNode) =>
      node.kind === "app" ? width * COLUMN_X[0] : node.kind === "permission" ? width * COLUMN_X[1] : width * COLUMN_X[2];

    const simulation = d3.forceSimulation<ForceNode>(nodes)
      .alphaDecay(ALPHA_DECAY)
      .force(
        "link",
        d3.forceLink<ForceNode, ForceLink>(links)
          .id((node) => node.id)
          .distance(FORCE_LINK_DISTANCE)
          .strength(FORCE_LINK_STRENGTH),
      )
      .force("charge", d3.forceManyBody().strength(FORCE_CHARGE))
      .force("x", d3.forceX<ForceNode>((node) => xByKind(node)).strength(FORCE_X_STRENGTH))
      .force("y", d3.forceY<ForceNode>(height / 2).strength(FORCE_Y_STRENGTH))
      .force("collide", d3.forceCollide<ForceNode>((node) => node.radius + FORCE_COLLIDE_PADDING));

    const linkSel = svg.append("g")
      .attr("fill", "none")
      .selectAll("line.link")
      .data(links)
      .join("line")
      .attr("class", "link")
      .attr("stroke", (d) => (d.kind === "app-perm" ? colors.primary[300] : colors.severity.high))
      .attr("stroke-width", (d) => Math.max(0.6, Math.min(4, d.weight * 2)))
      .attr("opacity", 0.55);

    const nodeSel = svg.append("g")
      .selectAll("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer");

    nodeSel.append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => {
        if (d.kind === "app") return colors.primary[500];
        if (d.kind === "permission") return colors.permission.network;
        return severityColor((d.severity as Vulnerability["severity"]) ?? "Moderate");
      })
      .attr("stroke", colors.gradient.diverging[2])
      .attr("stroke-width", 1.5);

    nodeSel.append("text")
      .attr("dy", (d) => d.radius + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => (d.kind === "app" ? 11 : 10))
      .attr("fill", colors.gray[700])
      .text((d) => d.label);

    nodeSel
      .on("mouseenter", function (event: MouseEvent, d) {
        highlightNeighborhood(d);
        const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
        setTooltip({ visible: true, x: event.clientX - rect.left, y: event.clientY - rect.top, node: d });
      })
      .on("mousemove", function (event: MouseEvent) {
        const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
        setTooltip((current) => ({ ...current, x: event.clientX - rect.left, y: event.clientY - rect.top }));
      })
      .on("mouseleave", function () {
        resetHighlight();
        setTooltip((current) => ({ ...current, visible: false }));
      })
      .on("dblclick", function () {
        resetHighlight();
        simulation.alpha(0.3).restart();
      });

    // 仅 app 节点可拖动
    const drag = d3.drag<SVGGElement, ForceNode>()
      .filter((_, d) => d.kind === "app")
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x ?? 0;
        d.fy = d.y ?? 0;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    (nodeSel as d3.Selection<SVGGElement, ForceNode, SVGGElement, unknown>).call(drag);

    function highlightNeighborhood(target: ForceNode) {
      const neighbors = new Set<string>([target.id]);
      links.forEach((link) => {
        const source = typeof link.source === "string" ? link.source : (link.source as ForceNode).id;
        const targetId = typeof link.target === "string" ? link.target : (link.target as ForceNode).id;
        if (source === target.id) neighbors.add(targetId);
        if (targetId === target.id) neighbors.add(source);
      });
      nodeSel.attr("opacity", (d) => (neighbors.has(d.id) ? 1 : 0.15));
      linkSel.attr("opacity", (d) => {
        const source = typeof d.source === "string" ? d.source : (d.source as ForceNode).id;
        const targetId = typeof d.target === "string" ? d.target : (d.target as ForceNode).id;
        return source === target.id || targetId === target.id ? 0.95 : 0.05;
      });
    }
    function resetHighlight() {
      nodeSel.attr("opacity", 1);
      linkSel.attr("opacity", 0.55);
    }

    simulation.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as unknown as ForceNode).x ?? 0)
        .attr("y1", (d) => (d.source as unknown as ForceNode).y ?? 0)
        .attr("x2", (d) => (d.target as unknown as ForceNode).x ?? 0)
        .attr("y2", (d) => (d.target as unknown as ForceNode).y ?? 0);
      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
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
        aria-label="权限-CVE 关联力导向图"
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
        {tooltip.node && (
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: colors.gray[900] }}>
              {tooltip.node.label}
            </div>
            <div>
              类型：{tooltip.node.kind === "app" ? "应用" : tooltip.node.kind === "permission" ? "权限" : "CVE"}
            </div>
            {tooltip.node.kind === "app" && tooltip.node.clri !== undefined && (
              <div>CLRI = {tooltip.node.clri.toFixed(2)}</div>
            )}
            {tooltip.node.kind === "cve" && tooltip.node.severity && (
              <div>严重等级：{tooltip.node.severity}</div>
            )}
          </div>
        )}
      </ChartTooltip>
    </div>
  );
}
