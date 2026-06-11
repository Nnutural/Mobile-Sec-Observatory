import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PieChart } from "@/components/charts/PieChart";
import { colors } from "@/design/colors";

describe("PieChart", () => {
  it("renders total and empty state", () => {
    const { rerender } = render(
      <PieChart
        data={[
          { name: "严重", value: 1, color: colors.severity.critical },
          { name: "高危", value: 2, color: colors.severity.high },
        ]}
      />,
    );
    expect(screen.getByText("总数")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    rerender(<PieChart data={[]} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });
});
