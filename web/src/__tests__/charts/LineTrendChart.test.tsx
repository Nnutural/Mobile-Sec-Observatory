import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { colors } from "@/design/colors";

describe("LineTrendChart", () => {
  it("renders series labels and empty state", () => {
    const series = [
      { key: "high", name: "高危", color: colors.severity.high },
      { key: "low", name: "低危", color: colors.severity.low },
    ];
    const data = [
      { month: "2024-01", high: 1, low: 0 },
      { month: "2024-02", high: 2, low: 1 },
      { month: "2024-03", high: 0, low: 1 },
    ];
    const { rerender } = render(<LineTrendChart data={data} series={series} />);
    expect(screen.getByText("高危、低危")).toBeInTheDocument();
    rerender(<LineTrendChart data={[]} series={series} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });
});
