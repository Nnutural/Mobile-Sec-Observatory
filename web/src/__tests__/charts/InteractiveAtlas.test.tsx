import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InteractiveAtlas } from "@/components/charts/InteractiveAtlas";

describe("InteractiveAtlas", () => {
  it("renders android atlas svg", () => {
    const { container } = render(<InteractiveAtlas variant="android" />);
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    expect(container.querySelectorAll("g.node").length).toBeGreaterThan(0);
  });

  it("fires onSelect with node that has an id when clicked", () => {
    const handler = vi.fn();
    const { container } = render(<InteractiveAtlas variant="android" onSelect={handler} />);
    const firstNode = container.querySelector("g.node");
    expect(firstNode).not.toBeNull();
    fireEvent.click(firstNode!);
    expect(handler).toHaveBeenCalled();
    const argument = handler.mock.calls[0][0];
    expect(argument).toHaveProperty("id");
  });

  it("renders compare variant with both atlases", () => {
    const { container } = render(<InteractiveAtlas variant="compare" />);
    expect(container.querySelectorAll("g.node").length).toBeGreaterThan(4);
  });
});
