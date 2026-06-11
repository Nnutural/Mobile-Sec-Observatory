import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useDashboardStats } from "@/hooks/useData";

const sections = [
  ["1. Data Sources", "F-Droid, Android Security Bulletin, AOSP Documentation, OpenHarmony Documentation, PScout / Axplorer."],
  ["2. Sample Selection", "按类别均衡抽取应用，每个应用保留最近 3 个连续版本。"],
  ["3. Static Analysis Pipeline", "APK → androguard → Manifest → permissions → components → JSON."],
  ["4. Permission Risk Weights", "权限元数据记录 level、group、weight 与中文说明。"],
  ["5. PDI Formula", "PDI = α·ΔD + β·ΔS + γ·ΔC + δ·ΔE。"],
  ["6. CLRI Formula", "基于权限-API 与 CVE-组件映射估计权限与漏洞的关联风险。"],
  ["7. Reproducibility", "所有前端数据由 pipeline 导出到 web/public/data。"],
  ["8. Limitations", "F-Droid 样本偏差、静态分析局限与权限-API map 覆盖度。"],
];

export function Methodology() {
  const { data } = useDashboardStats();

  if (!data) {
    return <Skeleton className="h-[640px] w-full" />;
  }

  return (
    <article className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold tracking-normal" style={{ color: colors.gray[900] }}>Methodology</h1>
      <p className="text-sm" style={{ color: colors.gray[500] }}>Generated at: {data.generated_at}</p>
      {sections.map(([title, content]) => (
        <Card key={title} className="p-6">
          <h2 className="text-lg font-semibold" style={{ color: colors.primary[700] }}>{title}</h2>
          <p className="mt-3 leading-7" style={{ color: colors.gray[700] }}>{content}</p>
        </Card>
      ))}
    </article>
  );
}
