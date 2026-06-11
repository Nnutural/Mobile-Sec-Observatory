import { Badge } from "@/components/ui/badge";
import { colors } from "@/design/colors";
import { formatDate, formatNumber } from "@/utils/formatters";

export interface VersionTimelineItem {
  version_name: string;
  release_date: string;
  pdi?: number;
  silentExpansion?: string[];
}

export interface VersionTimelineProps {
  versions: VersionTimelineItem[];
  selectedVersion?: string;
  onSelect?: (version_name: string) => void;
  height?: number;
}

export function VersionTimeline({ versions, selectedVersion, onSelect, height }: VersionTimelineProps) {
  if (versions.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-lg border text-sm"
        style={{
          height: height ?? 320,
          borderColor: colors.gray[200],
          backgroundColor: colors.gray[50],
          color: colors.gray[500],
        }}
      >
        暂无数据
      </div>
    );
  }

  const maxPdi = Math.max(...versions.map((version) => Math.abs(version.pdi ?? 0)), 1);

  return (
    <div className="w-full overflow-auto pr-1" style={{ height: height ?? versions.length * 96 }}>
      <div className="relative">
        <div className="absolute left-[15px] top-6 h-[calc(100%-48px)] w-px" style={{ backgroundColor: colors.gray[200] }} />
        {versions.map((version) => {
          const selected = selectedVersion === version.version_name;
          const pdi = version.pdi ?? 0;
          const width = `${Math.min(Math.abs(pdi) / maxPdi, 1) * 100}%`;
          return (
            <button
              key={version.version_name}
              className="relative grid min-h-24 w-full grid-cols-[32px_1fr] gap-3 rounded-md py-2 text-left transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
              style={{ "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
              type="button"
              onClick={() => onSelect?.(version.version_name)}
            >
              <span
                className="relative z-10 mt-5 h-8 w-8 rounded-full border-4"
                style={{
                  borderColor: selected ? colors.primary[500] : colors.gray[300],
                  backgroundColor: colors.gradient.diverging[2],
                }}
              />
              <span
                className="rounded-lg border p-4"
                style={{
                  borderColor: selected ? colors.primary[500] : colors.gray[200],
                  backgroundColor: selected ? colors.primary[50] : colors.gradient.diverging[2],
                }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold" style={{ color: colors.gray[900] }}>
                    版本 {version.version_name}
                  </span>
                  <span className="text-xs" style={{ color: colors.gray[500] }}>
                    {formatDate(version.release_date)}
                  </span>
                </span>
                <span className="mt-3 grid grid-cols-[52px_1fr_56px] items-center gap-2 text-xs">
                  <span style={{ color: colors.gray[600] }}>PDI</span>
                  <span className="h-2 rounded" style={{ backgroundColor: colors.gray[200] }}>
                    <span
                      className="block h-2 rounded"
                      style={{ width, backgroundColor: pdi >= 0 ? colors.primary[500] : colors.severity.critical }}
                    />
                  </span>
                  <span className="text-right tabular-nums" style={{ color: colors.gray[700] }}>
                    {version.pdi === undefined ? "—" : formatNumber(pdi, 3)}
                  </span>
                </span>
                {version.silentExpansion && version.silentExpansion.length > 0 ? (
                  <span className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      style={{
                        "--mso-badge-bg": colors.severity.high,
                        "--mso-badge-fg": colors.gradient.diverging[2],
                      } as React.CSSProperties}
                    >
                      静默扩张：{version.silentExpansion.join(" / ")}
                    </Badge>
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
