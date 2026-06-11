import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VersionTimeline } from "@/components/charts/VersionTimeline";

describe("VersionTimeline", () => {
  it("renders versions, handles selection, and empty state", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <VersionTimeline
        versions={[{ version_name: "1.1.0", release_date: "2026-02-01", pdi: 1.2, silentExpansion: ["LOCATION"] }]}
        selectedVersion="1.1.0"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("版本 1.1.0"));
    expect(onSelect).toHaveBeenCalledWith("1.1.0");
    expect(screen.getByText("静默扩张：LOCATION")).toBeInTheDocument();
    rerender(<VersionTimeline versions={[]} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });
});
