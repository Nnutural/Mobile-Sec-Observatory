import type { PropsWithChildren } from "react";
import { createBrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { PageContainer } from "@/components/layout/PageContainer";
import { Sidebar } from "@/components/layout/Sidebar";
import { colors } from "@/design/colors";
import { About } from "@/pages/About";
import { Atlas } from "@/pages/Atlas";
import { Comparison } from "@/pages/Comparison";
import { Dashboard } from "@/pages/Dashboard";
import { Drift } from "@/pages/Drift";
import { Methodology } from "@/pages/Methodology";
import { Permissions } from "@/pages/Permissions";
import { Sensitivity } from "@/pages/Sensitivity";
import { Vulnerabilities } from "@/pages/Vulnerabilities";

function PageRoute({ children }: PropsWithChildren) {
  return <PageContainer>{children}</PageContainer>;
}

function SidebarRoute({ children, items }: PropsWithChildren<{ items: { id: string; label: string }[] }>) {
  return (
    <PageContainer>
      <div className="flex gap-6">
        <Sidebar items={items} />
        <div className="min-w-0 flex-1" style={{ color: colors.gray[900] }}>
          {children}
        </div>
      </div>
    </PageContainer>
  );
}

const permissionSidebar = [
  { id: "overview", label: "概览" },
  { id: "heatmap", label: "热力图" },
  { id: "combo", label: "组合矩阵" },
  { id: "table", label: "明细表格" },
  { id: "clri", label: "权限-CVE 关联" },
];

const driftSidebar = [
  { id: "selector", label: "应用切换" },
  { id: "timeline", label: "版本时间轴" },
  { id: "sankey", label: "权限组演化" },
  { id: "weights", label: "权重敏感性" },
];

const vulnerabilitySidebar = [
  { id: "filters", label: "筛选器" },
  { id: "trend", label: "月度趋势" },
  { id: "components", label: "组件分布" },
  { id: "table", label: "CVE 明细表" },
];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <PageRoute><Dashboard /></PageRoute> },
      { path: "atlas", element: <PageRoute><Atlas /></PageRoute> },
      { path: "permissions", element: <SidebarRoute items={permissionSidebar}><Permissions /></SidebarRoute> },
      { path: "drift", element: <SidebarRoute items={driftSidebar}><Drift /></SidebarRoute> },
      { path: "vulnerabilities", element: <SidebarRoute items={vulnerabilitySidebar}><Vulnerabilities /></SidebarRoute> },
      { path: "comparison", element: <PageRoute><Comparison /></PageRoute> },
      { path: "methodology", element: <PageRoute><Methodology /></PageRoute> },
      { path: "sensitivity", element: <PageRoute><Sensitivity /></PageRoute> },
      { path: "about", element: <PageRoute><About /></PageRoute> },
    ],
  },
]);
