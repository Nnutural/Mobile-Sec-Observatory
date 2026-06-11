import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Formula } from "@/components/Formula";

describe("Formula", () => {
  it("renders KaTeX output for valid tex", () => {
    const { container } = render(<Formula tex="\\alpha + \\beta" />);
    const katex = container.querySelector(".katex");
    expect(katex).not.toBeNull();
  });

  it("supports block mode wrapper", () => {
    const { container } = render(<Formula tex="x" block />);
    expect(container.querySelector("div")).not.toBeNull();
  });
});
