import { Link } from "react-router-dom";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { StatCard } from "@/components/charts/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useCLRI, useDashboardStats } from "@/hooks/useData";
import { formatNumber } from "@/utils/formatters";

const modules = [
  { title: "机制图谱", subtitle: "Atlas", to: "/atlas" },
  { title: "权限分析", subtitle: "Permissions", to: "/permissions" },
  { title: "权限漂移", subtitle: "Drift", to: "/drift" },
  { title: "漏洞态势", subtitle: "Vulnerabilities", to: "/vulnerabilities" },
  { title: "国产对比", subtitle: "Comparison", to: "/comparison" },
  { title: "方法说明", subtitle: "Methodology", to: "/methodology" },
];

export function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: clri } = useCLRI();

  if (!stats || !clri) {
    return <Skeleton className="h-[720px] w-full" />;
  }

  const overview = stats.overview;

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
          Coverage: {overview.total_apps} Apps · {overview.total_apk_versions} Versions · {overview.bulletin_months} Months · {overview.total_cves} CVEs
        </p>
      </section>

      <section className="grid grid-cols-4 gap-4">
        <StatCard label="Apps analyzed" value={overview.total_apps} subtext="F-Droid mock sample" />
        <StatCard label="Avg dangerous perms" value={formatNumber(overview.avg_dangerous_permissions, 2)} />
        <StatCard label="CVEs logged" value={overview.total_cves} subtext={`${overview.bulletin_months} months`} />
        <StatCard label="Avg CLRI" value={formatNumber(overview.avg_clri, 2)} subtext={`${overview.high_risk_apps_count} high risk`} />
      </section>

      <section className="grid grid-cols-[1fr_1.1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mini Trend Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <LineTrendChart data={stats.vuln_monthly_trend} height={220} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top High-CLRI Apps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clri.app_scores.map((app) => (
              <div key={app.app_id} className="grid grid-cols-[160px_1fr_56px] items-center gap-3 text-sm">
                <span style={{ color: colors.gray[700] }}>{app.app_name}</span>
                <div className="h-2 rounded" style={{ backgroundColor: colors.gray[200] }}>
                  <div className="h-2 rounded" style={{ width: `${Math.min(app.clri, 60)}%`, backgroundColor: colors.primary[500] }} />
                </div>
                <span style={{ color: colors.gray[800] }}>{app.clri}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-3 gap-4">
        {modules.map((module) => (
          <Link key={module.to} to={module.to}>
            <Card className="p-6 transition hover:shadow-md">
              <div className="text-lg font-semibold" style={{ color: colors.gray[900] }}>{module.title}</div>
              <div className="mt-1 text-sm" style={{ color: colors.gray[500] }}>{module.subtitle}</div>
              <div className="mt-6 text-sm font-medium" style={{ color: colors.primary[500] }}>进入模块</div>
            </Card>
          </Link>
        ))}
      </section>

      <footer className="border-t pt-6 text-sm" style={{ borderColor: colors.gray[200], color: colors.gray[500] }}>
        数据更新日期 · 引用方式 · GitHub Repo · 论文链接
      </footer>
    </div>
  );
}
