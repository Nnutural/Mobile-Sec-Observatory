import { useEffect, useState, type RefObject } from "react";

export interface ChartSize {
  width: number;
  height: number;
}

export function useChartSize(
  ref: RefObject<HTMLElement>,
  defaultWidth = 800,
  height = 0,
): ChartSize {
  const [width, setWidth] = useState<number>(defaultWidth);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const initial = node.getBoundingClientRect().width;
    if (initial > 0) setWidth(initial);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = entry.contentRect.width;
      if (next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return { width, height };
}

export function clearSvg(ref: RefObject<SVGSVGElement>): void {
  if (!ref.current) return;
  while (ref.current.firstChild) {
    ref.current.removeChild(ref.current.firstChild);
  }
}

export function wrapText(text: string, maxChars = 18): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

export function uniqueArray<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}
