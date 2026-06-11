import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PermissionHeatmap } from "@/components/charts/PermissionHeatmap";
import {
  fixtureApps,
  fixturePermissionsMetadata,
  fixtureVersions,
} from "@/__tests__/fixtures";

describe("PermissionHeatmap", () => {
  it("renders an svg with role=img for valid data", () => {
    const { container } = render(
      <PermissionHeatmap
        versions={fixtureVersions}
        apps={fixtureApps}
        permissionsMetadata={fixturePermissionsMetadata}
      />,
    );
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it("renders empty placeholder when no apps", () => {
    const { getByText } = render(
      <PermissionHeatmap versions={[]} apps={[]} permissionsMetadata={fixturePermissionsMetadata} />,
    );
    expect(getByText("暂无数据")).toBeInTheDocument();
  });

  it("invokes onSelect when a cell is clicked", () => {
    const handler = vi.fn();
    const { container } = render(
      <PermissionHeatmap
        versions={fixtureVersions}
        apps={fixtureApps}
        permissionsMetadata={fixturePermissionsMetadata}
        onSelect={handler}
      />,
    );
    const cell = container.querySelector("rect.cell");
    expect(cell).not.toBeNull();
    fireEvent.click(cell!);
    expect(handler).toHaveBeenCalled();
  });
});
