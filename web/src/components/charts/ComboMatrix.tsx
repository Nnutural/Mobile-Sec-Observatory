import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { colors } from "@/design/colors";
import type { App, AppVersion } from "@/types";
import { useChartSize } from "@/utils/d3Helpers";

// 左列：网络权限；右列：敏感权限组的代表权限
const NETWORK_PERMISSIONS = [
  { id: "android.permission.INTERNET", label: "INTERNET" },
  { id: "android.permission.ACCESS_NETWORK_STATE", label: "ACCESS_NETWORK_STATE" },
  { id: "android.permission.ACCESS_WIFI_STATE", label: "ACCESS_WIFI_STATE" },
  { id: "android.permission.CHANGE_NETWORK_STATE", label: "CHANGE_NETWORK_STATE" },
  { id: "android.permission.CHANGE_WIFI_STATE", label: "CHANGE_WIFI_STATE" },
] as const;

const SENSITIVE_PERMISSIONS = [
  { id: "android.permission.ACCESS_FINE_LOCATION", label: "LOCATION", colorKey: "location" as const },
  { id: "android.permission.CAMERA", label: "CAMERA", colorKey: "camera" as const },
  { id: "android.permission.RECORD_AUDIO", label: "MICROPHONE", colorKey: "microphone" as const },
  { id: "android.permission.READ_CONTACTS", label: "CONTACTS", colorKey: "contacts" as const },
  { id: "android.permission.READ_SMS", label: "SMS", colorKey: "sms" as const },
  { id: "android.permission.READ_EXTERNAL_STORAGE", label: "STORAGE", colorKey: "storage" as const },
  { id: "android.permission.READ_PHONE_STATE", label: "PHONE", colorKey: "phone" as const },
] as const;

// 应用点半径范围：4..12px，按 dangerous 数缩放
const MIN_RADIUS = 4;
const MAX_RADIUS = 12;
// 左右两列权限节点矩形宽度
const PERM_RECT_WIDTH = 168;
const PERM_RECT_HEIGHT = 26;

export interface ComboMatrixProps {
  versions: AppVersion[];
  apps: App[];
  height?: number;
  highlightedAppId?: string;
  onSelectApp?: (appId: string) => void;
}

interface NodePoint {
  appId: string;
  appName: string;
  cy: number;
  radius: number;
  networkCount: number;
  sensitiveCount: number;
  dangerousCount: number;
  network: string[];
  sensitive: string[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  detail: string;
}

function hashRatio(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

export function ComboMatrix({
  versions,
  apps,
  height = 520,
  highlightedAppId,
  onSelectApp,
}: ComboMatrixProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width } = useChartSize(containerRef, 900);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, text: "", detail: "" });

  const points = useMemo(() => {
    const latestByApp = new Map<string, AppVersion>();
    versions.forEach((version) => {
      const incumbent = latestByApp.get(version.app_id);
      if (!incumbent || version.release_date > incumbent.release_date) {
        latestByApp.set(version.app_id, version);
      }
    });

    const dangerousValues = apps
      .map((app) => latestByApp.get(app.id)?.permission_counts.dangerous ?? 0)
      .filter((value) => value > 0);
    const dangerousMax = dangerousValues.length === 0 ? 1 : Math.max(...dangerousValues, 1);

    const filtered: NodePoint[] = [];
    apps.forEach((app) => {
      const latest = latestByApp.get(app.id);
      if (!latest) return;
      const network = NETWORK_PERMISSIONS.filter((permission) => latest.permissions.all.includes(permission.id)).map(
        (permission) => permission.id,
      );
      const sensitive = SENSITIVE_PERMISSIONS.filter((permission) => latest.permissions.all.includes(permission.id)).map(
        (permission) => permission.id,
      );
      if (network.length === 0 && sensitive.length === 0) return;
      const dangerousCount = latest.permission_counts.dangerous;
      filtered.push({
        appId: app.id,
        appName: app.name_zh ?? app.name,
        cy: 0,
        radius: MIN_RADIUS + (dangerousCount / dangerousMax) * (MAX_RADIUS - MIN_RADIUS),
        networkCount: network.length,
        sensitiveCount: sensitive.length,
        dangerousCount,
        network,
        sensitive,
      });
    });
    return filtered;
  }, [apps, versions]);

  useEffect(() => {
    if (!svgRef.current || width === 0 || points.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 24, right: 24, bottom: 24, left: 24 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const root = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    const leftX = PERM_RECT_WIDTH / 2 + 8;
    const rightX = innerWidth - PERM_RECT_WIDTH / 2 - 8;
    const networkScale = d3.scalePoint<string>()
      .domain(NETWORK_PERMISSIONS.map((permission) => permission.id))
      .range([40, innerHeight - 40])
      .padding(0.5);
    const sensitiveScale = d3.scalePoint<string>()
      .domain(SENSITIVE_PERMISSIONS.map((permission) => permission.id))
      .range([40, innerHeight - 40])
      .padding(0.5);

    // 标题列头
    root.append("text")
      .attr("x", leftX)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", colors.gray[700])
      .text("网络相关权限");
    root.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", colors.gray[500])
      .text("应用（半径∝危险权限数）");
    root.append("text")
      .attr("x", rightX)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", colors.gray[700])
      .text("敏感资源权限");

    // 网络权限节点
    const networkGroup = root.append("g").attr("class", "network-nodes");
    NETWORK_PERMISSIONS.forEach((permission) => {
      const y = networkScale(permission.id) ?? 0;
      networkGroup
        .append("rect")
        .attr("class", `perm perm-${permission.id}`)
        .attr("x", leftX - PERM_RECT_WIDTH / 2)
        .attr("y", y - PERM_RECT_HEIGHT / 2)
        .attr("width", PERM_RECT_WIDTH)
        .attr("height", PERM_RECT_HEIGHT)
        .attr("rx", 4)
        .attr("fill", colors.permission.network)
        .attr("opacity", 0.85)
        .style("cursor", "pointer")
        .on("mouseenter", () => highlightByPermission(permission.id))
        .on("mouseleave", () => resetHighlight());
      networkGroup
        .append("text")
        .attr("x", leftX)
        .attr("y", y + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("fill", colors.gradient.diverging[2])
        .style("pointer-events", "none")
        .text(permission.label);
    });

    // 敏感权限节点
    const sensitiveGroup = root.append("g").attr("class", "sensitive-nodes");
    SENSITIVE_PERMISSIONS.forEach((permission) => {
      const y = sensitiveScale(permission.id) ?? 0;
      sensitiveGroup
        .append("rect")
        .attr("class", `perm perm-${permission.id}`)
        .attr("x", rightX - PERM_RECT_WIDTH / 2)
        .attr("y", y - PERM_RECT_HEIGHT / 2)
        .attr("width", PERM_RECT_WIDTH)
        .attr("height", PERM_RECT_HEIGHT)
        .attr("rx", 4)
        .attr("fill", colors.permission[permission.colorKey])
        .attr("opacity", 0.85)
        .style("cursor", "pointer")
        .on("mouseenter", () => highlightByPermission(permission.id))
        .on("mouseleave", () => resetHighlight());
      sensitiveGroup
        .append("text")
        .attr("x", rightX)
        .attr("y", y + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("fill", colors.gradient.diverging[2])
        .style("pointer-events", "none")
        .text(permission.label);
    });

    // 应用点 + 连线
    const middleStart = leftX + PERM_RECT_WIDTH / 2 + 16;
    const middleEnd = rightX - PERM_RECT_WIDTH / 2 - 16;
    const middleSpan = middleEnd - middleStart;
    const positioned = points.map((point) => ({
      ...point,
      cx: middleStart + hashRatio(point.appId + "x") * middleSpan,
      cy: 40 + hashRatio(point.appId + "y") * (innerHeight - 80),
    }));

    const linkGroup = root.append("g").attr("class", "links").attr("fill", "none");
    positioned.forEach((point) => {
      point.network.forEach((permissionId) => {
        const y = networkScale(permissionId) ?? 0;
        linkGroup
          .append("path")
          .attr("class", `link app-${point.appId} perm-${permissionId}`)
          .attr("d", `M ${leftX + PERM_RECT_WIDTH / 2} ${y} C ${point.cx - 30} ${y}, ${point.cx - 30} ${point.cy}, ${point.cx} ${point.cy}`)
          .attr("stroke", colors.permission.network)
          .attr("stroke-width", 1)
          .attr("opacity", 0.5);
      });
      point.sensitive.forEach((permissionId) => {
        const y = sensitiveScale(permissionId) ?? 0;
        linkGroup
          .append("path")
          .attr("class", `link app-${point.appId} perm-${permissionId}`)
          .attr("d", `M ${point.cx} ${point.cy} C ${point.cx + 30} ${point.cy}, ${point.cx + 30} ${y}, ${rightX - PERM_RECT_WIDTH / 2} ${y}`)
          .attr("stroke", colors.severity.high)
          .attr("stroke-width", 1)
          .attr("opacity", 0.5);
      });
    });

    const appGroup = root.append("g").attr("class", "apps");
    appGroup
      .selectAll("circle.app")
      .data(positioned)
      .join("circle")
      .attr("class", (d) => `app app-${d.appId}`)
      .attr("cx", (d) => d.cx)
      .attr("cy", (d) => d.cy)
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => (d.appId === highlightedAppId ? colors.primary[700] : colors.primary[500]))
      .attr("stroke", colors.gradient.diverging[2])
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .attr("tabindex", 0)
      .on("mouseenter", (event: MouseEvent, d) => {
        highlightByApp(d.appId);
        const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          text: d.appName,
          detail: `网络权限 ${d.networkCount} · 敏感权限 ${d.sensitiveCount} · 危险权限总数 ${d.dangerousCount}`,
        });
      })
      .on("mousemove", (event: MouseEvent) => {
        const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
        setTooltip((current) => ({ ...current, x: event.clientX - rect.left, y: event.clientY - rect.top }));
      })
      .on("mouseleave", () => {
        resetHighlight();
        setTooltip((current) => ({ ...current, visible: false }));
      })
      .on("click", (_: MouseEvent, d) => onSelectApp?.(d.appId))
      .on("keydown", function (event: KeyboardEvent, d) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectApp?.(d.appId);
        }
      });

    function highlightByApp(appId: string) {
      svg.selectAll<SVGPathElement, unknown>(".link")
        .attr("opacity", function () {
          return this.classList.contains(`app-${appId}`) ? 0.95 : 0.05;
        })
        .attr("stroke-width", function () {
          return this.classList.contains(`app-${appId}`) ? 2 : 1;
        });
      svg.selectAll<SVGCircleElement, unknown>(".app").attr("opacity", function () {
        return this.classList.contains(`app-${appId}`) ? 1 : 0.2;
      });
    }

    function highlightByPermission(permissionId: string) {
      svg.selectAll<SVGPathElement, unknown>(".link")
        .attr("opacity", function () {
          return this.classList.contains(`perm-${permissionId}`) ? 0.95 : 0.05;
        });
    }

    function resetHighlight() {
      svg.selectAll<SVGPathElement, unknown>(".link").attr("opacity", 0.5).attr("stroke-width", 1);
      svg.selectAll<SVGCircleElement, unknown>(".app").attr("opacity", 1);
    }

    return () => {
      svg.selectAll("*").remove();
    };
  }, [height, highlightedAppId, onSelectApp, points, width]);

  if (points.length === 0) {
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
        aria-label="网络-敏感权限组合矩阵"
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
        <div className="space-y-1">
          <div className="font-semibold" style={{ color: colors.gray[900] }}>
            {tooltip.text}
          </div>
          <div>{tooltip.detail}</div>
        </div>
      </ChartTooltip>
    </div>
  );
}
