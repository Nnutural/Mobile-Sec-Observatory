import React, { Suspense } from "react";
import { ExportModeProvider } from "@/components/charts/ExportMode";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageContainer } from "@/components/layout/PageContainer";
import { colors } from "@/design/colors";
import { Dashboard } from "@/pages/Dashboard";

const Atlas = React.lazy(() => import("@/pages/Atlas").then((module) => ({ default: module.Atlas })));
const Permissions = React.lazy(() => import("@/pages/Permissions").then((module) => ({ default: module.Permissions })));
const Drift = React.lazy(() => import("@/pages/Drift").then((module) => ({ default: module.Drift })));
const Vulnerabilities = React.lazy(() =>
  import("@/pages/Vulnerabilities").then((module) => ({ default: module.Vulnerabilities })),
);
const Comparison = React.lazy(() => import("@/pages/Comparison").then((module) => ({ default: module.Comparison })));
const Sensitivity = React.lazy(() => import("@/pages/Sensitivity").then((module) => ({ default: module.Sensitivity })));

const exportPages = [
  { id: "dashboard", element: <Dashboard /> },
  { id: "atlas", element: <Atlas /> },
  { id: "permissions", element: <Permissions /> },
  { id: "drift", element: <Drift /> },
  { id: "vulnerabilities", element: <Vulnerabilities /> },
  { id: "comparison", element: <Comparison /> },
  { id: "sensitivity", element: <Sensitivity /> },
];

export function PaperFigureExportSurface() {
  return (
    <div
      aria-hidden="true"
      className="fixed top-0 pointer-events-none"
      data-testid="paper-figure-export-surface"
      style={{
        left: "-20000px",
        width: "1440px",
        backgroundColor: colors.gray[50],
      }}
    >
      <ExportModeProvider>
        <div className="space-y-12">
          {exportPages.map((page) => (
            <PageContainer key={page.id}>
              <ErrorBoundary>
                <Suspense fallback={null}>{page.element}</Suspense>
              </ErrorBoundary>
            </PageContainer>
          ))}
        </div>
      </ExportModeProvider>
    </div>
  );
}
