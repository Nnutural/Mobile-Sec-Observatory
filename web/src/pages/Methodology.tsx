import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { Formula } from "@/components/Formula";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { useDashboardStats, usePermissionsMetadata } from "@/hooks/useData";
import type { PermissionMeta } from "@/types";
import { formatDate, formatNumber } from "@/utils/formatters";

const levelLabel: Record<PermissionMeta["level"], string> = {
  normal: "普通",
  dangerous: "危险",
  signature: "签名",
  signatureOrSystem: "签名或系统",
};

interface PermissionRow extends PermissionMeta {
  groupText: string;
}

const introSections: Array<[string, string]> = [
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
];

const fieldGlossary = [
  { symbol: "α / β / γ / δ", desc: "PDI 四个分量的权重，∈ [0,1]，且 α+β+γ+δ ≈ 1。基线取 (0.3, 0.4, 0.2, 0.1)。" },
  { symbol: "ΔD", desc: "新增 dangerous 权限的风险权重之和（按 permissions_metadata.weight）。" },
  { symbol: "ΔS", desc: "同组扩张分量：新版本新增、且其权限组在旧版本已被授权过的权限数。" },
  { symbol: "ΔC", desc: "暴露组件累积量变化：|N_curr|·|D_curr| − |N_prev|·|D_prev|，N 为暴露组件，D 为危险权限。" },
  { symbol: "ΔE", desc: "签名权限差值：当前版本签名权限数 − 上一版本签名权限数。" },
  { symbol: "ρ(p,v)", desc: "权限 p 触达的 API 与 CVE v 影响组件的 API 交集占比。" },
  { symbol: "σ(v)", desc: "CVE 严重等级评分：Critical=4 / High=3 / Moderate=2 / Low=1。" },
  { symbol: "w_p", desc: "权限风险权重，由 permissions_metadata.json 给定。" },
];

export function Methodology() {
  const { data: stats } = useDashboardStats();
  const { data: metadata } = usePermissionsMetadata();

  if (!stats || !metadata) {
    return <Skeleton className="h-[640px] w-full" />;
  }

  const permissionRows: PermissionRow[] = Object.values(metadata.permissions)
    .map((permission) => ({ ...permission, groupText: permission.group ?? "未分组" }))
    .sort((a, b) => b.weight - a.weight);

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

      {introSections.map(([title, content]) => (
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
        <h2 className="text-lg font-semibold" style={{ color: colors.primary[700] }}>
          4. 权限风险权重
        </h2>
        <p className="mt-3 leading-7" style={{ color: colors.gray[700] }}>
          权限元数据记录 protection level、权限组、风险权重和中文说明。表格按 weight 倒序排列，下表为完整元数据。
        </p>
        <div className="mt-4">
          <DataTable
            columns={columns}
            rows={permissionRows}
            pageSize={10}
            searchPlaceholder="搜索权限名 / 权限组"
            searchKeys={["name", "groupText"]}
            initialSort={{ key: "weight", direction: "desc" }}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold" style={{ color: colors.primary[700] }}>
          5. PDI 公式
        </h2>
        <p className="mt-3 leading-7" style={{ color: colors.gray[700] }}>
          权限漂移指数 PDI（Permission Drift Index）衡量两个相邻版本之间的权限治理风险变化。综合公式：
        </p>
        <Formula block tex={String.raw`\mathrm{PDI} = \alpha\,\Delta D + \beta\,\Delta S + \gamma\,\Delta C + \delta\,\Delta E`} />
        <p className="mt-2 leading-7" style={{ color: colors.gray[700] }}>各分量定义如下：</p>
        <Formula block tex={String.raw`\Delta D = \sum_{p \in (P_{curr} \setminus P_{prev}) \cap \mathrm{Dangerous}} w_p`} />
        <Formula block tex={String.raw`\Delta S = \left| \{ p \in P_{new}\,:\,\mathrm{group}(p) \in \mathrm{Groups}(P_{prev}) \} \right|`} />
        <Formula block tex={String.raw`\Delta C = |N_{curr}| \cdot |D_{curr}| - |N_{prev}| \cdot |D_{prev}|`} />
        <Formula block tex={String.raw`\Delta E = E_{curr} - E_{prev}`} />
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold" style={{ color: colors.primary[700] }}>
          6. CLRI 公式
        </h2>
        <p className="mt-3 leading-7" style={{ color: colors.gray[700] }}>
          组合风险指数 CLRI（Composite Linkage Risk Index）基于权限-API 与 CVE-组件映射估计应用权限面与漏洞面的关联风险。
        </p>
        <Formula block tex={String.raw`\mathrm{CLRI}(\mathrm{app}) = \sum_{p \in P_{\mathrm{app}}} w_p \sum_{v \in V} \rho(p, v)\,\sigma(v)`} />
        <Formula block tex={String.raw`\rho(p, v) = \frac{|\mathrm{API}(p) \cap \mathrm{API}(\mathrm{comp}(v))|}{|\mathrm{API}(p)|}`} />
        <div className="mt-4 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border px-3 py-2 text-left" style={{ borderColor: colors.gray[200], color: colors.gray[700] }}>
                  字段
                </th>
                <th className="border px-3 py-2 text-left" style={{ borderColor: colors.gray[200], color: colors.gray[700] }}>
                  含义
                </th>
              </tr>
            </thead>
            <tbody>
              {fieldGlossary.map((row) => (
                <tr key={row.symbol}>
                  <td className="border px-3 py-2 font-medium" style={{ borderColor: colors.gray[200], color: colors.gray[800] }}>
                    {row.symbol}
                  </td>
                  <td className="border px-3 py-2" style={{ borderColor: colors.gray[200], color: colors.gray[700] }}>
                    {row.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold" style={{ color: colors.primary[700] }}>
          7. 复现指南
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-7" style={{ color: colors.gray[700] }}>
          <li>
            在仓库根目录执行 <code style={{ color: colors.primary[700] }}>python -m pipeline.main run-all</code>，
            生成 web/public/data 下的全部 JSON。
          </li>
          <li>
            进入 <code style={{ color: colors.primary[700] }}>web/</code> 执行
            <code style={{ color: colors.primary[700] }}> npm install </code>与
            <code style={{ color: colors.primary[700] }}> npm run build</code>。
          </li>
          <li>
            详细数据契约与图表索引见 <code style={{ color: colors.primary[700] }}>README.md</code> 与
            <code style={{ color: colors.primary[700] }}> pipeline/README.md</code>。
          </li>
        </ol>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold" style={{ color: colors.primary[700] }}>
          8. 局限性
        </h2>
        <p className="mt-3 leading-7" style={{ color: colors.gray[700] }}>
          当前样本以 F-Droid 与离线公告为主，静态分析无法覆盖运行时上下文，权限-API 映射覆盖度也会影响 CLRI 的解释边界。
          PDI 权重存在主观性，请结合
          <a
            href="/sensitivity"
            className="ml-1 underline"
            style={{ color: colors.primary[500] }}
          >
            敏感性分析页
          </a>
          的 Spearman 系数综合解读。
        </p>
      </Card>
    </article>
  );
}
