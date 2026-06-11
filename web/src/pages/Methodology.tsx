import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useDashboardStats, usePermissionsMetadata } from "@/hooks/useData";
import type { PermissionMeta } from "@/types";
import { formatDate, formatNumber } from "@/utils/formatters";

const sections = [
  [
    "1. 数据来源",
    "平台整合 F-Droid 应用样本、Android Security Bulletin、AOSP 文档、OpenHarmony 权限治理资料，以及 PScout / Axplorer 权限-API 映射作为辅助证据。",
  ],
  [
    "2. 样本选择",
    "应用样本按类别进行均衡抽取，每个应用保留连续版本以观察权限声明、暴露组件和安全标志随版本变化的趋势。",
  ],
  [
    "3. 静态分析流水线",
    "APK 经离线解析后抽取 Manifest 权限、组件导出状态、SDK 信息与安全标志，最终统一导出为 web/public/data 下的 JSON 数据。",
  ],
  [
    "4. 权限风险权重",
    "权限元数据记录 protection level、权限组、风险权重和中文说明。危险权限、网络能力、敏感权限组扩张会在 PDI 与 CLRI 计算中被加权。",
  ],
  [
    "5. PDI 公式",
    "PDI = α·ΔD + β·ΔS + γ·ΔC + δ·ΔE。KaTeX 数学排版将在阶段 4 接入，本阶段保留纯文本公式。",
  ],
  [
    "6. CLRI 公式",
    "CLRI 基于权限-API 与 CVE-组件映射估计应用权限面与漏洞面的关联风险，用于在首页和权限分析页识别高风险应用。",
  ],
  [
    "7. 可复现性",
    "所有前端图表只消费 pipeline 导出的静态 JSON；图表组件不直接修改数据，也不在浏览器端引入额外采集逻辑。",
  ],
  [
    "8. 局限性",
    "当前样本以 F-Droid 与离线公告为主，静态分析无法覆盖运行时上下文，权限-API 映射覆盖度也会影响 CLRI 的解释边界。",
  ],
];

const levelLabel: Record<PermissionMeta["level"], string> = {
  normal: "普通",
  dangerous: "危险",
  signature: "签名",
  signatureOrSystem: "签名或系统",
};

interface PermissionRow extends PermissionMeta {
  groupText: string;
}

export function Methodology() {
  const { data: stats } = useDashboardStats();
  const { data: metadata } = usePermissionsMetadata();

  if (!stats || !metadata) {
    return <Skeleton className="h-[640px] w-full" />;
  }

  const permissionRows: PermissionRow[] = Object.values(metadata.permissions)
    .slice(0, 30)
    .map((permission) => ({ ...permission, groupText: permission.group ?? "未分组" }));
  const columns: Array<DataTableColumn<PermissionRow>> = [
    { key: "name", header: "权限名", sortable: true },
    { key: "level", header: "等级", render: (row) => levelLabel[row.level], sortable: true },
    { key: "groupText", header: "权限组", sortable: true },
    {
      key: "weight",
      header: "风险权重",
      align: "right",
      sortable: true,
      sortValue: (row) => row.weight,
      render: (row) => formatNumber(row.weight, 2),
    },
    { key: "description_zh", header: "说明" },
  ];

  return (
    <article className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold tracking-normal" style={{ color: colors.gray[900] }}>
        方法说明
      </h1>
      <p className="text-sm" style={{ color: colors.gray[500] }}>
        数据更新日期：{formatDate(stats.generated_at)}
      </p>
      {sections.map(([title, content]) => (
        <Card key={title} className="p-6">
          <h2 className="text-lg font-semibold" style={{ color: colors.primary[700] }}>
            {title}
          </h2>
          <p className="mt-3 leading-7" style={{ color: colors.gray[700] }}>
            {content}
          </p>
        </Card>
      ))}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold" style={{ color: colors.primary[700] }}>
          权限元数据样例
        </h2>
        <DataTable
          columns={columns}
          rows={permissionRows}
          pageSize={10}
          searchPlaceholder="搜索权限名 / 权限组"
          searchKeys={["name", "groupText"]}
        />
      </Card>
    </article>
  );
}
