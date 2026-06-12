import React, { Suspense, type PropsWithChildren, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageContainer } from "@/components/layout/PageContainer";
import { Sidebar } from "@/components/layout/Sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/design/colors";
import { Dashboard } from "@/pages/Dashboard";

const Atlas = React.lazy(() => import("@/pages/Atlas").then((module) => ({ default: module.Atlas })));
const Permissions = React.lazy(() => import("@/pages/Permissions").then((module) => ({ default: module.Permissions })));
const Drift = React.lazy(() => import("@/pages/Drift").then((module) => ({ default: module.Drift })));
const Vulnerabilities = React.lazy(() =>
  import("@/pages/Vulnerabilities").then((module) => ({ default: module.Vulnerabilities })),
);
const Comparison = React.lazy(() => import("@/pages/Comparison").then((module) => ({ default: module.Comparison })));
const Methodology = React.lazy(() => import("@/pages/Methodology").then((module) => ({ default: module.Methodology })));
const Sensitivity = React.lazy(() => import("@/pages/Sensitivity").then((module) => ({ default: module.Sensitivity })));
const About = React.lazy(() => import("@/pages/About").then((module) => ({ default: module.About })));

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

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
      { path: "atlas", element: <PageRoute><LazyPage><Atlas /></LazyPage></PageRoute> },
      { path: "permissions", element: <SidebarRoute items={permissionSidebar}><LazyPage><Permissions /></LazyPage></SidebarRoute> },
      { path: "drift", element: <SidebarRoute items={driftSidebar}><LazyPage><Drift /></LazyPage></SidebarRoute> },
      { path: "vulnerabilities", element: <SidebarRoute items={vulnerabilitySidebar}><LazyPage><Vulnerabilities /></LazyPage></SidebarRoute> },
      { path: "comparison", element: <PageRoute><LazyPage><Comparison /></LazyPage></PageRoute> },
      { path: "methodology", element: <PageRoute><LazyPage><Methodology /></LazyPage></PageRoute> },
      { path: "sensitivity", element: <PageRoute><LazyPage><Sensitivity /></LazyPage></PageRoute> },
      { path: "about", element: <PageRoute><LazyPage><About /></LazyPage></PageRoute> },
    ],
  },
]);
