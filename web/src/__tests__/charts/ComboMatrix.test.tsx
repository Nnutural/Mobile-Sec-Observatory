import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComboMatrix } from "@/components/charts/ComboMatrix";
import { fixtureApps, fixtureVersions } from "@/__tests__/fixtures";

describe("ComboMatrix", () => {
  it("renders SVG when apps have permissions", () => {
    const { container } = render(<ComboMatrix versions={fixtureVersions} apps={fixtureApps} />);
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it("renders empty placeholder when no dangerous app exists", () => {
    const { getByText } = render(<ComboMatrix versions={[]} apps={[]} />);
    expect(getByText("暂无数据")).toBeInTheDocument();
  });
});
