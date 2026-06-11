import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparisonFlowDiagram } from "@/components/charts/ComparisonFlowDiagram";
import { colors } from "@/design/colors";
import { fixtureFlow } from "@/__tests__/fixtures";

describe("ComparisonFlowDiagram", () => {
  it("renders both Android and OpenHarmony nodes", () => {
    const { container } = render(
      <ComparisonFlowDiagram android={fixtureFlow.android} openharmony={fixtureFlow.openharmony} />,
    );
    expect(container.querySelectorAll('g.flow-node[data-side="android"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('g.flow-node[data-side="openharmony"]').length).toBeGreaterThan(0);
  });

  it("highlights counterpart node on hover", () => {
    const { container } = render(
      <ComparisonFlowDiagram android={fixtureFlow.android} openharmony={fixtureFlow.openharmony} />,
    );
    const androidManifest = container.querySelector('g.flow-node[data-side="android"][data-node-id="manifest"]');
    expect(androidManifest).not.toBeNull();
    fireEvent.mouseEnter(androidManifest!);
    const counterpart = container.querySelector('g.flow-node[data-side="openharmony"][data-node-id="manifest"] rect');
    expect(counterpart).not.toBeNull();
    expect(counterpart!.getAttribute("stroke")).toBe(colors.primary[500]);
  });

  it("renders empty placeholder when both diagrams are empty", () => {
    const empty = { nodes: [], edges: [] };
    const { getByText } = render(<ComparisonFlowDiagram android={empty} openharmony={empty} />);
    expect(getByText("暂无流程数据")).toBeInTheDocument();
  });
});
