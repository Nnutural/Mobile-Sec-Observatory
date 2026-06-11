import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeightSlider } from "@/components/charts/WeightSlider";

describe("WeightSlider", () => {
  it("renders Chinese labels and normalizes weights", () => {
    const onChange = vi.fn();
    render(<WeightSlider weights={{ alpha: 0.25, beta: 0.25, gamma: 0.25, delta: 0.25 }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("α 危险权限新增"), { target: { value: "0.4" } });
    expect(screen.getByText("权重敏感性分析")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith({ alpha: 0.4, beta: 0.19999999999999998, gamma: 0.19999999999999998, delta: 0.19999999999999998 });
  });
});
