import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import {
  ANDROID_ATLAS,
  OPENHARMONY_ATLAS,
  type AtlasNode,
  type AtlasVariant,
} from "@/components/charts/helpers/atlasData";
import { colors } from "@/design/colors";
import { useChartSize } from "@/utils/d3Helpers";

// 节点矩形宽 / 高（中文标签需要更宽）
const NODE_WIDTH = 168;
const NODE_HEIGHT = 28;
// d3 树布局尺寸：[nodeSize y, nodeSize x（垂直间距）]
const NODE_SIZE: [number, number] = [38, 220];

export interface InteractiveAtlasProps {
  variant: AtlasVariant;
  height?: number;
  selectedId?: string | null;
  onSelect?: (node: AtlasNode | null) => void;
}

function drawAtlas(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: AtlasNode,
  origin: { x: number; y: number },
  selectedId: string | null | undefined,
  onSelect?: (node: AtlasNode | null) => void,
  baseColor = colors.primary[500],
) {
  const root = d3.hierarchy<AtlasNode>(data);
  const layout = d3.tree<AtlasNode>().nodeSize(NODE_SIZE);
  const tree = layout(root);

  const subgroup = group.append("g").attr("transform", `translate(${origin.x}, ${origin.y})`);

  // 连接线（贝塞尔）
  subgroup.append("g")
    .attr("fill", "none")
    .attr("stroke", colors.gray[300])
    .selectAll("path.link")
    .data(tree.links())
    .join("path")
    .attr("class", "link")
    .attr("d", d3.linkHorizontal<d3.HierarchyPointLink<AtlasNode>, d3.HierarchyPointNode<AtlasNode>>()
      .x((node) => node.y)
      .y((node) => node.x))
    .attr("stroke-width", 1.2);

  const nodes = subgroup.append("g")
    .selectAll("g.node")
    .data(tree.descendants())
    .join("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.y}, ${d.x})`)
    .style("cursor", "pointer")
    .attr("tabindex", 0)
    .on("click", (_event, d) => onSelect?.(d.data))
    .on("keydown", function (event: KeyboardEvent, d) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect?.(d.data);
      }
    });

  nodes.append("rect")
    .attr("x", -NODE_WIDTH / 2)
    .attr("y", -NODE_HEIGHT / 2)
    .attr("width", NODE_WIDTH)
    .attr("height", NODE_HEIGHT)
    .attr("rx", (d) => (d.children ? 6 : 14))
    .attr("fill", (d) => (d.data.id === selectedId ? baseColor : colors.gradient.diverging[2]))
    .attr("stroke", (d) => (d.data.id === selectedId ? colors.primary[700] : baseColor))
    .attr("stroke-width", (d) => (d.data.id === selectedId ? 2 : 1.2));

  nodes.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", 4)
    .attr("font-size", 12)
    .attr("fill", (d) => (d.data.id === selectedId ? colors.gradient.diverging[2] : colors.gray[800]))
    .text((d) => d.data.label_zh);
}

export function InteractiveAtlas({ variant, height = 560, selectedId, onSelect }: InteractiveAtlasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width } = useChartSize(containerRef, 900);

  const trees = useMemo(() => {
    if (variant === "android") return [ANDROID_ATLAS];
    if (variant === "openharmony") return [OPENHARMONY_ATLAS];
    return [ANDROID_ATLAS, OPENHARMONY_ATLAS];
  }, [variant]);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const root = svg.append("g");

    if (variant === "compare") {
      const colWidth = width / 2;
      root.append("text")
        .attr("x", colWidth / 2)
        .attr("y", 22)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("fill", colors.comparison.android)
        .text("Android");
      root.append("text")
        .attr("x", colWidth + colWidth / 2)
        .attr("y", 22)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("fill", colors.comparison.openharmony)
        .text("OpenHarmony");
      drawAtlas(root, ANDROID_ATLAS, { x: 100, y: height / 2 }, selectedId, onSelect, colors.comparison.android);
      drawAtlas(
        root,
        OPENHARMONY_ATLAS,
        { x: colWidth + 100, y: height / 2 },
        selectedId,
        onSelect,
        colors.comparison.openharmony,
      );
    } else {
      drawAtlas(root, trees[0], { x: 140, y: height / 2 }, selectedId, onSelect);
    }

    return () => {
      svg.selectAll("*").remove();
    };
  }, [height, onSelect, selectedId, trees, variant, width]);

  if (trees.length === 0) {
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
    <div ref={containerRef} className="relative w-full overflow-auto" style={{ height }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label="安全机制图谱"
        className="block"
        style={{ width: "100%", height }}
      />
    </div>
  );
}
