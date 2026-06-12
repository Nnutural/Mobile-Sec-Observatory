import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { colors } from "@/design/colors";
import { useExportRegistry } from "@/store/exportRegistry";
import { downloadBlob, exportChartAsPng, exportChartAsSvg, timestamp } from "@/utils/exportChart";

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  exportName: string;
  filterControls?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, exportName, filterControls, children }: ChartCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "svg" | null>(null);
  const register = useExportRegistry((state) => state.register);
  const unregister = useExportRegistry((state) => state.unregister);

  useEffect(() => {
    register({ exportName, title, ref: cardRef });
    return () => unregister(exportName, cardRef);
  }, [exportName, register, title, unregister]);

  const handleExport = async (kind: "png" | "svg") => {
    if (!cardRef.current) return;
    setExporting(kind);
    try {
      const blob =
        kind === "png" ? await exportChartAsPng(cardRef.current) : await exportChartAsSvg(cardRef.current);
      downloadBlob(blob, `${exportName}_${timestamp()}.${kind}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`图表导出失败：${message}`);
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
            <span>{exporting === "png" ? "导出中" : "下载 PNG"}</span>
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
            <span>{exporting === "svg" ? "导出中" : "下载 SVG"}</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filterControls && <div className="flex flex-wrap items-center gap-3">{filterControls}</div>}
        <div ref={cardRef} className="relative">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </CardContent>
    </Card>
  );
}
