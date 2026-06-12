import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { Download, X } from "lucide-react";
import { PaperFigureExportSurface } from "@/components/charts/PaperFigureExportSurface";
import { PAPER_FIGURE_EXPORT_NAMES, PAPER_FIGURE_EXPORT_ORDER } from "@/components/charts/paperFigureManifest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { colors } from "@/design/colors";
import { useExportRegistry, type ExportRegistryEntry } from "@/store/exportRegistry";
import { downloadBlob, exportChartAsPng, exportChartAsSvg } from "@/utils/exportChart";

type ExportFormat = "png" | "svg" | "both";

interface BatchExportButtonProps {
  includeAllPages?: boolean;
}

function safePrefix(value: string): string {
  return (value || "mso_paper_figures").replace(/[^A-Za-z0-9_-]+/g, "_");
}

function selectedFormats(format: ExportFormat): Array<"png" | "svg"> {
  if (format === "both") return ["png", "svg"];
  return [format];
}

function zipFileName(index: number, exportName: string, ext: string): string {
  const safeName = exportName.replace(/[^A-Za-z0-9_-]+/g, "_");
  return `${String(index).padStart(2, "0")}_${safeName}.${ext}`;
}

function sortEntries(entries: ExportRegistryEntry[]): ExportRegistryEntry[] {
  return [...entries].sort((a, b) => {
    const aOrder = PAPER_FIGURE_EXPORT_ORDER.get(a.exportName) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = PAPER_FIGURE_EXPORT_ORDER.get(b.exportName) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.exportName.localeCompare(b.exportName);
  });
}

export function BatchExportButton({ includeAllPages = true }: BatchExportButtonProps) {
  const entries = useExportRegistry((state) => state.entries);
  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);
  const [open, setOpen] = useState(false);
  const [surfaceMounted, setSurfaceMounted] = useState(false);
  const [autoSelect, setAutoSelect] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [prefix, setPrefix] = useState("mso_paper_figures");
  const [progress, setProgress] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const selectedEntries = useMemo(
    () => sortedEntries.filter((entry) => selected.includes(entry.exportName)),
    [selected, sortedEntries],
  );
  const registeredNames = useMemo(() => new Set(sortedEntries.map((entry) => entry.exportName)), [sortedEntries]);
  const missingNames = useMemo(
    () => (includeAllPages ? PAPER_FIGURE_EXPORT_NAMES.filter((name) => !registeredNames.has(name)) : []),
    [includeAllPages, registeredNames],
  );
  const allPagesReady = !includeAllPages || missingNames.length === 0;

  useEffect(() => {
    if (!open || !autoSelect) return;
    setSelected(sortedEntries.map((entry) => entry.exportName));
  }, [autoSelect, open, sortedEntries]);

  const handleOpen = () => {
    if (includeAllPages) setSurfaceMounted(true);
    setAutoSelect(true);
    setSelected(sortedEntries.map((entry) => entry.exportName));
    setFailures([]);
    setProgress("");
    setOpen(true);
  };

  const handleClose = () => {
    if (exporting) return;
    setOpen(false);
    setAutoSelect(false);
    setSurfaceMounted(false);
  };

  const toggleOne = (entry: ExportRegistryEntry) => {
    setAutoSelect(false);
    setSelected((current) =>
      current.includes(entry.exportName)
        ? current.filter((item) => item !== entry.exportName)
        : [...current, entry.exportName],
    );
  };

  const handleExport = async () => {
    if (!allPagesReady) {
      setFailures([`还有 ${missingNames.length} 张全页面图表正在准备，请稍候再导出`]);
      return;
    }

    const formats = selectedFormats(format);
    const total = selectedEntries.length * formats.length;
    if (total === 0) {
      setFailures(["请至少选择一张图表"]);
      return;
    }

    setExporting(true);
    setFailures([]);
    try {
      const zip = new JSZip();
      const failed: string[] = [];
      let done = 0;

      for (const [entryIndex, entry] of selectedEntries.entries()) {
        for (const ext of formats) {
          done += 1;
          setProgress(`正在导出 ${done} / ${total}`);
          try {
            const el = entry.ref.current;
            if (!el) throw new Error("图表节点已卸载");
            const blob = ext === "png" ? await exportChartAsPng(el) : await exportChartAsSvg(el);
            zip.file(zipFileName(entryIndex + 1, entry.exportName, ext), blob);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            failed.push(`${entry.title}：${message}`);
          }
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${safePrefix(prefix)}.zip`);
      setFailures(failed);
      setProgress(`导出完成 ${done} / ${total}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {includeAllPages && surfaceMounted && <PaperFigureExportSurface />}
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        <Download size={14} className="mr-1" aria-hidden />
        导出全部论文图
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true">
          <div
            className="w-full max-w-2xl rounded-md border p-5 shadow-xl"
            style={{ borderColor: colors.gray[200], backgroundColor: colors.gradient.diverging[2] }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: colors.gray[900] }}>
                  批量导出论文图
                </h2>
                <p className="mt-1 text-sm" style={{ color: colors.gray[500] }}>
                  {includeAllPages
                    ? "会临时渲染所有页面中的论文图并统一打包，无需逐个菜单访问。"
                    : "选择当前已注册的图表并统一打包。"}
                </p>
              </div>
              <button
                type="button"
                className="rounded p-1 transition hover:opacity-75 focus-visible:outline-none focus-visible:ring-2"
                style={{ "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
                disabled={exporting}
                onClick={handleClose}
                aria-label="关闭"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAutoSelect(false);
                  setSelected(sortedEntries.map((entry) => entry.exportName));
                }}
              >
                全选
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAutoSelect(false);
                  setSelected((current) =>
                    sortedEntries.map((entry) => entry.exportName).filter((name) => !current.includes(name)),
                  );
                }}
              >
                反选
              </Button>
              {includeAllPages && (
                <span className="text-sm" style={{ color: allPagesReady ? colors.primary[700] : colors.gray[500] }}>
                  {allPagesReady
                    ? `已准备 ${sortedEntries.length} 张图表`
                    : `正在准备所有页面图表：${PAPER_FIGURE_EXPORT_NAMES.length - missingNames.length} / ${
                        PAPER_FIGURE_EXPORT_NAMES.length
                      }`}
                </span>
              )}
            </div>

            <div className="max-h-56 space-y-2 overflow-auto rounded border p-3" style={{ borderColor: colors.gray[200] }}>
              {sortedEntries.length === 0 ? (
                <p className="text-sm" style={{ color: colors.gray[500] }}>
                  {includeAllPages ? "正在加载所有页面图表。" : "当前页面没有可导出的图表。"}
                </p>
              ) : (
                sortedEntries.map((entry) => (
                  <label key={entry.exportName} className="flex items-center gap-2 text-sm" style={{ color: colors.gray[700] }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(entry.exportName)}
                      onChange={() => toggleOne(entry)}
                    />
                    <span>{entry.title}</span>
                    <span className="font-mono text-xs" style={{ color: colors.gray[500] }}>
                      {entry.exportName}
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
              <label className="text-sm" style={{ color: colors.gray[700] }}>
                格式
                <select
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  style={{ borderColor: colors.gray[300], backgroundColor: colors.gradient.diverging[2] }}
                  value={format}
                  onChange={(event) => setFormat(event.currentTarget.value as ExportFormat)}
                >
                  <option value="png">仅 PNG</option>
                  <option value="svg">仅 SVG</option>
                  <option value="both">两者</option>
                </select>
              </label>
              <label className="text-sm" style={{ color: colors.gray[700] }}>
                文件前缀
                <Input className="mt-1" value={prefix} onChange={(event) => setPrefix(event.currentTarget.value)} />
              </label>
            </div>

            {progress && (
              <div className="mt-4 space-y-2">
                <div className="text-sm" style={{ color: colors.primary[700] }}>
                  {progress}
                </div>
                <div className="h-2 overflow-hidden rounded" style={{ backgroundColor: colors.gray[100] }}>
                  <div className="h-full w-full rounded" style={{ backgroundColor: colors.primary[300] }} />
                </div>
              </div>
            )}

            {failures.length > 0 && (
              <div className="mt-4 rounded border p-3 text-sm" style={{ borderColor: colors.severity.high, color: colors.severity.high }}>
                <div className="font-medium">以下图表导出失败，其余已照常打包：</div>
                <ul className="mt-2 list-disc pl-5">
                  {failures.map((failure) => (
                    <li key={failure}>{failure}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={exporting} onClick={handleClose}>
                关闭
              </Button>
              <Button type="button" disabled={exporting || !allPagesReady} onClick={handleExport}>
                {allPagesReady ? "开始导出" : "准备中"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
