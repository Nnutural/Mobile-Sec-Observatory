import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ForceGraph } from "@/components/charts/ForceGraph";
import type { CLRIData } from "@/types";
import { fixtureClri } from "@/__tests__/fixtures";

describe("ForceGraph", () => {
  it("renders nodes for app/perm/cve", () => {
    const { container } = render(<ForceGraph clri={fixtureClri} />);
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    expect(container.querySelectorAll("g.node").length).toBeGreaterThan(0);
  });

  it("renders empty placeholder when no apps", () => {
    const empty: CLRIData = { ...fixtureClri, app_scores: [], permission_vuln_edges: [] };
    const { getByText } = render(<ForceGraph clri={empty} />);
    expect(getByText("暂无数据")).toBeInTheDocument();
  });

  it("does not crash on double click", () => {
    const { container } = render(<ForceGraph clri={fixtureClri} />);
    const firstNode = container.querySelector("g.node");
    expect(firstNode).not.toBeNull();
    fireEvent.doubleClick(firstNode!);
  });
});
