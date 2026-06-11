import type { ReactNode } from "react";
import { colors } from "@/design/colors";

export interface ChartTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  containerWidth?: number;
  containerHeight?: number;
  children: ReactNode;
}

const TOOLTIP_MARGIN = 12;
const TOOLTIP_WIDTH_GUARD = 220;
const TOOLTIP_HEIGHT_GUARD = 90;

export function ChartTooltip({
  visible,
  x,
  y,
  containerWidth,
  containerHeight,
  children,
}: ChartTooltipProps) {
  if (!visible) return null;

  const w = containerWidth ?? Infinity;
  const h = containerHeight ?? Infinity;
  const left = x + TOOLTIP_WIDTH_GUARD + TOOLTIP_MARGIN > w ? x - TOOLTIP_WIDTH_GUARD : x + TOOLTIP_MARGIN;
  const top = y + TOOLTIP_HEIGHT_GUARD + TOOLTIP_MARGIN > h ? y - TOOLTIP_HEIGHT_GUARD : y + TOOLTIP_MARGIN;

  return (
    <div
      className="pointer-events-none absolute z-30 max-w-[260px] rounded-md border px-3 py-2 text-xs shadow-lg"
      role="tooltip"
      style={{
        left,
        top,
        backgroundColor: colors.gradient.diverging[2],
        borderColor: colors.gray[200],
        color: colors.gray[800],
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
