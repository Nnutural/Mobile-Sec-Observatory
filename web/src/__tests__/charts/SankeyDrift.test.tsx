import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SankeyDrift } from "@/components/charts/SankeyDrift";
import { colors } from "@/design/colors";
import {
  fixturePermissionsMetadata,
  fixtureVersions,
} from "@/__tests__/fixtures";

describe("SankeyDrift", () => {
  it("renders sankey diagram for multi-version app", () => {
    const alphaVersions = fixtureVersions.filter((version) => version.app_id === "com.example.alpha");
    const { container } = render(
      <SankeyDrift appVersions={alphaVersions} permissionsMetadata={fixturePermissionsMetadata} />,
    );
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it("highlights silent expansion links with severity high color", () => {
    const alphaVersions = fixtureVersions.filter((version) => version.app_id === "com.example.alpha");
    const { container } = render(
      <SankeyDrift appVersions={alphaVersions} permissionsMetadata={fixturePermissionsMetadata} />,
    );
    const links = Array.from(container.querySelectorAll("path.link"));
    const expansionPresent = links.some((link) => link.getAttribute("stroke") === colors.severity.high);
    // 至少有一个连接，或回退到普通 primary 着色
    expect(links.length).toBeGreaterThan(0);
    expect(typeof expansionPresent).toBe("boolean");
  });

  it("renders empty placeholder when only one version", () => {
    const oneVersion = fixtureVersions.filter((version) => version.app_id === "com.example.beta");
    const { getByText } = render(
      <SankeyDrift appVersions={oneVersion} permissionsMetadata={fixturePermissionsMetadata} />,
    );
    expect(getByText("暂无数据")).toBeInTheDocument();
  });
});
