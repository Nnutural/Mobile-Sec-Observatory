import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { colors } from "@/design/colors";

describe("StackedBarChart", () => {
  it("renders stack labels and empty state", () => {
    const stacks = [
      { key: "normal", name: "普通权限", color: colors.primary[300] },
      { key: "dangerous", name: "危险权限", color: colors.severity.high },
      { key: "signature", name: "签名权限", color: colors.permission.contacts },
    ];
    const { rerender } = render(
      <StackedBarChart data={[{ label: "应用 A", normal: 1, dangerous: 2, signature: 3 }]} stacks={stacks} />,
    );
    expect(screen.getByText("普通权限、危险权限、签名权限")).toBeInTheDocument();
    rerender(<StackedBarChart data={[]} stacks={stacks} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });
});
