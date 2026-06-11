import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadarChart } from "@/components/charts/RadarChart";

describe("RadarChart", () => {
  it("renders axis labels and empty state", () => {
    const { rerender } = render(
      <RadarChart
        data={[
          { axis: "ΔD", value: 1 },
          { axis: "ΔS", value: 2 },
          { axis: "ΔC", value: 3 },
          { axis: "ΔE", value: 4 },
        ]}
      />,
    );
    expect(screen.getByText("ΔD 新增危险权限、ΔS 同组扩张、ΔC 网络-敏感组合、ΔE 暴露组件")).toBeInTheDocument();
    rerender(<RadarChart data={[]} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });
});
