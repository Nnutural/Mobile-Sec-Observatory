import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartCard } from "@/components/charts/ChartCard";

describe("ChartCard", () => {
  it("renders title, subtitle, and download buttons", () => {
    render(
      <ChartCard title="测试图" subtitle="测试副标题" exportName="test_chart">
        <div data-testid="chart-body">内容</div>
      </ChartCard>,
    );

    expect(screen.getByText("测试图")).toBeInTheDocument();
    expect(screen.getByText("测试副标题")).toBeInTheDocument();
    expect(screen.getByLabelText("下载 PNG")).toBeInTheDocument();
    expect(screen.getByLabelText("下载 SVG")).toBeInTheDocument();
    expect(screen.getByTestId("chart-body")).toBeInTheDocument();
  });
});
