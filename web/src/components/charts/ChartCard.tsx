import { useRef, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { toPng, toSvg } from "html-to-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { colors } from "@/design/colors";

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  exportName: string;
  filterControls?: ReactNode;
  children: ReactNode;
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}`;
}

function watermarkText(): string {
  const now = new Date();
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `MobileSec Observatory · ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function triggerDownload(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function withWatermark<T>(node: HTMLElement, fn: () => Promise<T>): Promise<T> {
  const mark = document.createElement("div");
  mark.textContent = watermarkText();
  mark.style.position = "absolute";
  mark.style.right = "12px";
  mark.style.bottom = "10px";
  mark.style.fontSize = "10px";
  mark.style.color = colors.gray[400];
  mark.style.pointerEvents = "none";
  mark.style.zIndex = "5";
  node.appendChild(mark);
  return fn().finally(() => {
    if (mark.parentNode === node) node.removeChild(mark);
  });
}

async function fallbackSvgDownload(node: HTMLElement, baseName: string) {
  const svg = node.querySelector("svg");
  if (!svg) throw new Error("当前图表暂未渲染 SVG，无法降级导出");
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const serializer = new XMLSerializer();
  const source = `<?xml version="1.0" standalone="no"?>\n${serializer.serializeToString(cloned)}`;
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${baseName}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ChartCard({ title, subtitle, exportName, filterControls, children }: ChartCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "svg" | null>(null);

  const handleExport = async (kind: "png" | "svg") => {
    if (!cardRef.current) return;
    setExporting(kind);
    const baseName = `${exportName}_${timestamp()}`;
    try {
      await withWatermark(cardRef.current, async () => {
        if (kind === "png") {
          const url = await toPng(cardRef.current!, {
            pixelRatio: 2,
            backgroundColor: colors.gradient.diverging[2],
            cacheBust: true,
          });
          triggerDownload(url, `${baseName}.png`);
        } else {
          try {
            const url = await toSvg(cardRef.current!, {
              backgroundColor: colors.gradient.diverging[2],
              cacheBust: true,
            });
            triggerDownload(url, `${baseName}.svg`);
          } catch {
            await fallbackSvgDownload(cardRef.current!, baseName);
          }
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-alert
      alert(`截图导出失败：${message}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle>{title}</CardTitle>
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: colors.gray[500] }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
            style={{
              borderColor: colors.gray[300],
              color: colors.gray[700],
              "--tw-ring-color": colors.primary[500],
            } as React.CSSProperties}
            disabled={exporting !== null}
            onClick={() => handleExport("png")}
            aria-label="下载 PNG"
          >
            <Download size={12} aria-hidden />
            <span>{exporting === "png" ? "导出中…" : "下载 PNG"}</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
            style={{
              borderColor: colors.gray[300],
              color: colors.gray[700],
              "--tw-ring-color": colors.primary[500],
            } as React.CSSProperties}
            disabled={exporting !== null}
            onClick={() => handleExport("svg")}
            aria-label="下载 SVG"
          >
            <Download size={12} aria-hidden />
            <span>{exporting === "svg" ? "导出中…" : "下载 SVG"}</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filterControls && <div className="flex flex-wrap items-center gap-3">{filterControls}</div>}
        <div ref={cardRef} className="relative">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
