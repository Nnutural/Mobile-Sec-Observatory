import { Link } from "react-router-dom";
import { LineTrendChart, type LineTrendDatum } from "@/components/charts/LineTrendChart";
import { StatCard } from "@/components/charts/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useCLRI, useDashboardStats } from "@/hooks/useData";
import { formatDate, formatNumber } from "@/utils/formatters";
import { SEVERITY_LABEL, SEVERITY_ORDER, severityColor } from "@/utils/i18n";

const modules = [
  { title: "机制图谱", subtitle: "Android / OpenHarmony 安全机制可视化", to: "/atlas" },
  { title: "权限分析", subtitle: "30 应用的权限维度分布", to: "/permissions" },
  { title: "权限漂移", subtitle: "PDI 指标与版本演化", to: "/drift" },
  { title: "漏洞态势", subtitle: "Bulletin 漏洞趋势与组件分布", to: "/vulnerabilities" },
  { title: "国产对比", subtitle: "12 维 Android × OpenHarmony 对比", to: "/comparison" },
  { title: "方法说明", subtitle: "数据来源与计算公式", to: "/methodology" },
];

const severityKey = {
  Critical: "critical",
  High: "high",
  Moderate: "moderate",
  Low: "low",
} as const;

export function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: clri } = useCLRI();

  if (!stats || !clri) {
    return <Skeleton className="h-[720px] w-full" />;
  }

  const overview = stats.overview;
  const trendData: LineTrendDatum[] = stats.vuln_monthly_trend;
  const trendSeries = SEVERITY_ORDER.map((severity) => ({
    key: severityKey[severity],
    name: SEVERITY_LABEL[severity],
    color: severityColor(severity),
  }));
  const topApps = [...clri.app_scores].sort((a, b) => b.clri - a.clri).slice(0, 5);
  const maxClri = Math.max(...topApps.map((app) => app.clri), 1);
  const generatedDate = formatDate(stats.generated_at);

  return (
    <div className="space-y-10">
      <section
        className="flex h-[240px] flex-col justify-center rounded-lg border p-8"
        style={{ borderColor: colors.primary[100], backgroundColor: colors.primary[50] }}
      >
        <h1 className="text-3xl font-bold tracking-normal" style={{ color: colors.primary[900] }}>
          MobileSec Observatory
        </h1>
        <p className="mt-3 text-lg" style={{ color: colors.gray[700] }}>
          移动终端权限治理与漏洞演化的可视化分析平台
        </p>
        <p className="mt-6 text-sm" style={{ color: colors.gray[600] }}>
          共 {formatNumber(overview.total_apps)} 应用 · {formatNumber(overview.total_apk_versions)} 版本 ·{" "}
          {formatNumber(overview.bulletin_months)} 月公告 · {formatNumber(overview.total_cves)} 条 CVE
        </p>
      </section>

      <section className="grid grid-cols-4 gap-4">
        <StatCard label="分析应用数" value={formatNumber(overview.total_apps)} subtext="F-Droid 样本" />
        <StatCard
          label="平均危险权限"
          value={formatNumber(overview.avg_dangerous_permissions, 2)}
          subtext="按最新版本统计"
        />
        <StatCard
          label="漏洞条目"
          value={formatNumber(overview.total_cves)}
          subtext={`公告月数：${formatNumber(overview.bulletin_months)}`}
          accent="severity"
        />
        <StatCard
          label="平均 CLRI"
          value={formatNumber(overview.avg_clri, 2)}
          subtext={`高风险应用：${formatNumber(overview.high_risk_apps_count)}`}
        />
      </section>

      <section className="grid grid-cols-[1fr_1.1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>漏洞月度趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <LineTrendChart data={trendData} series={trendSeries} height={220} mode="area" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>高 CLRI 应用 Top 5</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topApps.map((app) => (
              <div key={app.app_id} className="grid grid-cols-[160px_1fr_64px] items-center gap-3 text-sm">
                <span style={{ color: colors.gray[700] }}>{app.app_name}</span>
                <div className="h-2 rounded" style={{ backgroundColor: colors.gray[200] }}>
                  <div
                    className="h-2 rounded"
                    style={{ width: `${(app.clri / maxClri) * 100}%`, backgroundColor: colors.primary[500] }}
                  />
                </div>
                <span className="text-right tabular-nums" style={{ color: colors.gray[800] }}>
                  {formatNumber(app.clri, 2)} 分
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-3 gap-4">
        {modules.map((module) => (
          <Link
            key={module.to}
            className="rounded-lg transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
            style={{ "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
            to={module.to}
          >
            <Card className="p-6 transition hover:shadow-md">
              <div className="text-lg font-semibold" style={{ color: colors.gray[900] }}>
                {module.title}
              </div>
              <div className="mt-1 text-sm" style={{ color: colors.gray[500] }}>
                {module.subtitle}
              </div>
              <div className="mt-6 text-sm font-medium" style={{ color: colors.primary[500] }}>
                查看详情 →
              </div>
            </Card>
          </Link>
        ))}
      </section>

      <footer className="border-t pt-6 text-sm" style={{ borderColor: colors.gray[200], color: colors.gray[500] }}>
        数据更新日期：{generatedDate} · 引用：BUPT 移动终端安全期末研究 · 仓库：GitHub
      </footer>
    </div>
  );
}
