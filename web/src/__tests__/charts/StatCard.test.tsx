import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "@/components/charts/StatCard";

describe("StatCard", () => {
  it("renders Chinese label and value", () => {
    render(<StatCard label="分析应用数" value="12" subtext="F-Droid 样本" />);
    expect(screen.getByText("分析应用数")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("F-Droid 样本")).toBeInTheDocument();
  });
});
