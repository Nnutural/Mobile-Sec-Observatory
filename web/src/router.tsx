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
  { id: "overview", label: "Overview" },
  { id: "heatmap", label: "Heatmap" },
  { id: "combo", label: "Combo Matrix" },
  { id: "table", label: "Detail Table" },
];

const driftSidebar = [
  { id: "selector", label: "App Selector" },
  { id: "timeline", label: "Version Timeline" },
  { id: "sankey", label: "Group Evolution" },
  { id: "weights", label: "Weight Sensitivity" },
];

const vulnerabilitySidebar = [
  { id: "filters", label: "Filters" },
  { id: "trend", label: "Monthly Trend" },
  { id: "components", label: "Components" },
  { id: "table", label: "CVE Detail Table" },
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
      { path: "about", element: <PageRoute><About /></PageRoute> },
    ],
  },
]);
