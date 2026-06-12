import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { SankeyDrift } from "@/components/charts/SankeyDrift";
import { colors } from "@/design/colors";
import type { AppVersionsData, AppsData, PDIData, PermissionsMetadata, PDITransition } from "@/types";
import { formatNumber } from "@/utils/formatters";

interface DriftCompareViewProps {
  appIds: string[];
  pdi: PDIData;
  versions: AppVersionsData;
  apps: AppsData;
  permissionsMetadata: PermissionsMetadata;
  weights: PDIData["weights"];
}

interface RankRow {
  appId: string;
  appName: string;
  expansionCount: number;
  groups: string;
  betaShare: number;
}

function transitionScore(transition: PDITransition, weights: PDIData["weights"]): number {
  return (
    weights.alpha * transition.components.delta_d +
    weights.beta * transition.components.delta_s +
    weights.gamma * transition.components.delta_c +
    weights.delta * transition.components.delta_e
  );
}

function appName(apps: AppsData, appId: string): string {
  const app = apps.apps.find((item) => item.id === appId);
  return app?.name_zh ?? app?.name ?? appId;
}

function appVersions(versions: AppVersionsData, appId: string) {
  return versions.versions
    .filter((version) => version.app_id === appId)
    .sort((a, b) => a.release_date.localeCompare(b.release_date) || a.version_code - b.version_code);
}

export function DriftCompareView({ appIds, pdi, versions, apps, permissionsMetadata, weights }: DriftCompareViewProps) {
  const palette = Object.values(colors.permission);
  const trendData = useMemo(() => {
    const maxLength = Math.max(
      1,
      ...appIds.map((appId) => Math.max(1, appVersions(versions, appId).length)),
    );
    return Array.from({ length: maxLength }, (_, index) => {
      const row: Record<string, number | string | null> = { versionIndex: `v${index + 1}` };
      appIds.forEach((appId) => {
        const result = pdi.results.find((item) => item.app_id === appId);
        const versionCount = Math.max(1, appVersions(versions, appId).length);
        if (!result || index >= versionCount) {
          row[appId] = null;
          return;
        }
        let cumulative = 0;
        for (let transitionIndex = 0; transitionIndex < index; transitionIndex += 1) {
          const transition = result.drift_sequence[transitionIndex];
          if (transition) cumulative += transitionScore(transition, weights);
        }
        row[appId] = Number(cumulative.toFixed(4));
      });
      return row;
    });
  }, [appIds, pdi.results, versions, weights]);

  const rankRows: RankRow[] = useMemo(
    () =>
      appIds.map((appId) => {
        const result = pdi.results.find((item) => item.app_id === appId);
        const transitions = result?.drift_sequence ?? [];
        const expansionCount = transitions.reduce((sum, transition) => sum + transition.components.delta_s, 0);
        const groupIds = Array.from(new Set(transitions.flatMap((transition) => transition.details.silent_expansion_groups)));
        const cumulative = transitions.reduce((sum, transition) => sum + transitionScore(transition, weights), 0);
        const betaContribution = weights.beta * expansionCount;
        const groups = groupIds
          .map((groupId) => permissionsMetadata.groups[groupId]?.name_zh ?? groupId)
          .filter(Boolean)
          .join("，");
        return {
          appId,
          appName: appName(apps, appId),
          expansionCount,
          groups: groups || "无",
          betaShare: cumulative === 0 ? 0 : betaContribution / cumulative,
        };
      }),
    [appIds, apps, pdi.results, permissionsMetadata.groups, weights],
  );

  const columns: Array<DataTableColumn<RankRow>> = [
    { key: "appName", header: "应用", sortable: true },
    {
      key: "expansionCount",
      header: "总同组扩张次数",
      align: "right",
      sortable: true,
      sortValue: (row) => row.expansionCount,
    },
    { key: "groups", header: "涉及权限组", sortable: true },
    {
      key: "betaShare",
      header: "累计 PDI 中 β·ΔS 占比",
      align: "right",
      sortable: true,
      sortValue: (row) => row.betaShare,
      render: (row) => `${formatNumber(row.betaShare * 100, 2)}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <ChartCard title="多应用累计 PDI 趋势" exportName="drift_compare_trend">
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} />
              <XAxis dataKey="versionIndex" tick={{ fill: colors.gray[700], fontSize: 12 }} />
              <YAxis tick={{ fill: colors.gray[700], fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: colors.gradient.diverging[2], borderColor: colors.gray[200] }}
                formatter={(value: number, name: string) => [formatNumber(value, 4), appName(apps, name)]}
              />
              <Legend formatter={(value: string) => appName(apps, value)} />
              {appIds.map((appId, index) => (
                <Line
                  key={appId}
                  dataKey={appId}
                  type="monotone"
                  stroke={palette[index % palette.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {appIds.map((appId) => (
            <span key={appId} data-testid="drift-compare-series" className="sr-only">
              {appId}
            </span>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="横向权限组演化对比" exportName="drift_compare_sankey">
        <div className="grid gap-5 xl:grid-cols-3">
          {appIds.map((appId) => (
            <div key={appId} className="space-y-2">
              <h3 className="text-sm font-semibold" style={{ color: colors.primary[700] }}>
                {appName(apps, appId)}
              </h3>
              <SankeyDrift
                appVersions={appVersions(versions, appId)}
                permissionsMetadata={permissionsMetadata}
                weights={weights}
                height={360}
              />
            </div>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="同组扩张排行榜" exportName="drift_compare_expansion_rank">
        <DataTable columns={columns} rows={rankRows} pageSize={8} searchKeys={["appName", "groups"]} />
      </ChartCard>
    </div>
  );
}
