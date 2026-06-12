import { toPng, toSvg } from "html-to-image";
import { colors } from "@/design/colors";

export interface ExportChartOptions {
  backgroundColor?: string;
  pixelRatio?: number;
  watermark?: string;
}

function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}

export function timestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}`;
}

function defaultWatermark(): string {
  const now = new Date();
  return `MobileSec Observatory · ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function withWatermark<T>(node: HTMLElement, opts: ExportChartOptions, fn: () => Promise<T>): Promise<T> {
  const mark = document.createElement("div");
  mark.textContent = opts.watermark ?? defaultWatermark();
  mark.style.position = "absolute";
  mark.style.right = "12px";
  mark.style.bottom = "10px";
  mark.style.fontSize = "10px";
  mark.style.color = colors.gray[400];
  mark.style.pointerEvents = "none";
  mark.style.zIndex = "5";
  node.appendChild(mark);
  try {
    return await fn();
  } finally {
    if (mark.parentNode === node) node.removeChild(mark);
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, content] = dataUrl.split(",", 2);
  const mime = /data:([^;]+)/.exec(meta)?.[1] ?? "application/octet-stream";
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function svgSourceToBlob(source: string): Blob {
  return new Blob([source], { type: "image/svg+xml;charset=utf-8" });
}

function serializeFallbackSvg(node: HTMLElement): Blob {
  const svg = node.querySelector("svg");
  if (!svg) throw new Error("当前图表暂未渲染 SVG，无法降级导出");
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const source = `<?xml version="1.0" standalone="no"?>\n${new XMLSerializer().serializeToString(cloned)}`;
  return svgSourceToBlob(source);
}

export async function exportChartAsPng(el: HTMLElement, opts: ExportChartOptions = {}): Promise<Blob> {
  return withWatermark(el, opts, async () => {
    const dataUrl = await toPng(el, {
      pixelRatio: opts.pixelRatio ?? 2,
      backgroundColor: opts.backgroundColor ?? colors.gradient.diverging[2],
      cacheBust: true,
    });
    return dataUrlToBlob(dataUrl);
  });
}

export async function exportChartAsSvg(el: HTMLElement, opts: ExportChartOptions = {}): Promise<Blob> {
  return withWatermark(el, opts, async () => {
    try {
      const dataUrl = await toSvg(el, {
        backgroundColor: opts.backgroundColor ?? colors.gradient.diverging[2],
        cacheBust: true,
      });
      return dataUrlToBlob(dataUrl);
    } catch {
      return serializeFallbackSvg(el);
    }
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
