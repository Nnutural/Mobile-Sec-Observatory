import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { colors } from "@/design/colors";
import type { FlowDiagram } from "@/types";
import { useChartSize } from "@/utils/d3Helpers";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 44;
const COLUMN_PADDING = 24;
const HEADER_HEIGHT = 28;

export interface ComparisonFlowDiagramProps {
  android: FlowDiagram;
  openharmony: FlowDiagram;
  height?: number;
  selectedStep?: { side: "android" | "openharmony"; stepId: string } | null;
  onSelectStep?: (stepId: string, side: "android" | "openharmony") => void;
}

interface PositionedNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

function buildSharedOrder(android: FlowDiagram, openharmony: FlowDiagram): string[] {
  const order: string[] = [];
  const sharedIds = new Set<string>();
  android.nodes.forEach((node) => {
    if (openharmony.nodes.find((other) => other.id === node.id)) sharedIds.add(node.id);
  });
  android.nodes.forEach((node) => {
    if (sharedIds.has(node.id) && !order.includes(node.id)) order.push(node.id);
  });
  openharmony.nodes.forEach((node) => {
    if (sharedIds.has(node.id) && !order.includes(node.id)) order.push(node.id);
  });
  android.nodes.forEach((node) => {
    if (!order.includes(node.id)) order.push(node.id);
  });
  openharmony.nodes.forEach((node) => {
    if (!order.includes(node.id)) order.push(node.id);
  });
  return order;
}

function drawSide(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  diagram: FlowDiagram,
  columnX: number,
  sharedOrder: string[],
  innerHeight: number,
  sideLabel: string,
  side: "android" | "openharmony",
  selectedStep: ComparisonFlowDiagramProps["selectedStep"],
  onSelectStep?: ComparisonFlowDiagramProps["onSelectStep"],
) {
  const presentIds = diagram.nodes.map((node) => node.id);
  const presentOrder = sharedOrder.filter((id) => presentIds.includes(id));
  const idToIndex = new Map(sharedOrder.map((id, index) => [id, index]));
  const slotCount = Math.max(presentOrder.length, sharedOrder.length, 1);
  const slotHeight = (innerHeight - HEADER_HEIGHT) / slotCount;

  const positioned: PositionedNode[] = diagram.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    x: columnX,
    y: HEADER_HEIGHT + (idToIndex.get(node.id) ?? 0) * slotHeight + slotHeight / 2,
  }));

  // 列标题
  group.append("text")
    .attr("x", columnX)
    .attr("y", 14)
    .attr("text-anchor", "middle")
    .attr("font-size", 13)
    .attr("fill", side === "android" ? colors.comparison.android : colors.comparison.openharmony)
    .text(sideLabel);

  // 边 + 箭头
  const arrowMarkerId = `flow-arrow-${side}`;
  group.append("defs")
    .append("marker")
    .attr("id", arrowMarkerId)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5 L10,0 L0,5")
    .attr("fill", colors.gray[400]);

  diagram.edges.forEach((edge) => {
    const from = positioned.find((node) => node.id === edge.from);
    const to = positioned.find((node) => node.id === edge.to);
    if (!from || !to) return;
    group.append("line")
      .attr("x1", from.x)
      .attr("y1", from.y + NODE_HEIGHT / 2)
      .attr("x2", to.x)
      .attr("y2", to.y - NODE_HEIGHT / 2)
      .attr("stroke", colors.gray[400])
      .attr("stroke-width", 1.5)
      .attr("marker-end", `url(#${arrowMarkerId})`);
  });

  // 节点矩形
  const nodes = group.append("g")
    .selectAll("g.node")
    .data(positioned)
    .join("g")
    .attr("class", (d) => `flow-node side-${side} step-${d.id}`)
    .attr("data-node-id", (d) => d.id)
    .attr("data-side", side)
    .attr("transform", (d) => `translate(${d.x - NODE_WIDTH / 2}, ${d.y - NODE_HEIGHT / 2})`)
    .style("cursor", "pointer")
    .attr("tabindex", 0);

  nodes.append("rect")
    .attr("width", NODE_WIDTH)
    .attr("height", NODE_HEIGHT)
    .attr("rx", 6)
    .attr("fill", colors.gradient.diverging[2])
    .attr("stroke", (d) =>
      selectedStep && selectedStep.stepId === d.id && selectedStep.side === side
        ? colors.primary[700]
        : colors.gray[300],
    )
    .attr("stroke-width", (d) =>
      selectedStep && selectedStep.stepId === d.id && selectedStep.side === side ? 2 : 1.2,
    );

  nodes.append("text")
    .attr("x", NODE_WIDTH / 2)
    .attr("y", NODE_HEIGHT / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", colors.gray[800])
    .text((d) => d.label);

  nodes
    .on("mouseenter", function (_event, d) {
      const svg = (this as SVGGElement).ownerSVGElement as SVGSVGElement;
      d3.select(svg).selectAll<SVGGElement, PositionedNode>(`g.flow-node[data-node-id="${d.id}"]`)
        .selectAll("rect")
        .attr("stroke", colors.primary[500])
        .attr("stroke-width", 2);
      d3.select(svg).selectAll<SVGGElement, PositionedNode>(`g.flow-node[data-node-id="${d.id}"]`)
        .selectAll("text")
        .attr("fill", colors.primary[700]);
    })
    .on("mouseleave", function (_event, d) {
      const svg = (this as SVGGElement).ownerSVGElement as SVGSVGElement;
      const isSelected = selectedStep && selectedStep.stepId === d.id;
      d3.select(svg).selectAll<SVGGElement, PositionedNode>(`g.flow-node[data-node-id="${d.id}"]`)
        .selectAll("rect")
        .attr("stroke", isSelected ? colors.primary[700] : colors.gray[300])
        .attr("stroke-width", isSelected ? 2 : 1.2);
      d3.select(svg).selectAll<SVGGElement, PositionedNode>(`g.flow-node[data-node-id="${d.id}"]`)
        .selectAll("text")
        .attr("fill", colors.gray[800]);
    })
    .on("click", (_event, d) => onSelectStep?.(d.id, side))
    .on("keydown", function (event: KeyboardEvent, d) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelectStep?.(d.id, side);
      }
    });
}

export function ComparisonFlowDiagram({
  android,
  openharmony,
  height = 520,
  selectedStep,
  onSelectStep,
}: ComparisonFlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width } = useChartSize(containerRef, 960);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    if (android.nodes.length === 0 && openharmony.nodes.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    const innerHeight = height - 8;
    const colWidth = (width - COLUMN_PADDING * 3) / 2;
    const leftCenter = COLUMN_PADDING + colWidth / 2;
    const rightCenter = COLUMN_PADDING * 2 + colWidth + colWidth / 2;

    const shared = buildSharedOrder(android, openharmony);

    const root = svg.append("g");
    drawSide(root, android, leftCenter, shared, innerHeight, "Android", "android", selectedStep, onSelectStep);
    drawSide(root, openharmony, rightCenter, shared, innerHeight, "OpenHarmony", "openharmony", selectedStep, onSelectStep);

    return () => {
      svg.selectAll("*").remove();
    };
  }, [android, height, onSelectStep, openharmony, selectedStep, width]);

  if (android.nodes.length === 0 && openharmony.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex w-full items-center justify-center rounded-md text-sm"
        style={{ minHeight: height, backgroundColor: colors.gray[50], color: colors.gray[500] }}
      >
        暂无流程数据
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label="Android × OpenHarmony 权限流程双栏对照"
        className="block w-full"
        style={{ maxHeight: height }}
      />
    </div>
  );
}
