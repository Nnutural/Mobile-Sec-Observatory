import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "@/components/ErrorBoundary";

describe("ErrorBoundary", () => {
  it("renders fallback when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Broken() {
      throw new Error("boom");
      return null;
    }

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByText("该图表加载失败，请刷新或在浏览器控制台查看详情")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("clears state and remounts children after retry", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let shouldThrow = true;
    const mounts: string[] = [];

    function Flaky() {
      if (shouldThrow) {
        throw new Error("first render fails");
      }
      mounts.push("mounted");
      return <div>恢复成功</div>;
    }

    render(
      <ErrorBoundary onReset={() => {
        shouldThrow = false;
      }}>
        <Flaky />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    expect(screen.getByText("恢复成功")).toBeInTheDocument();
    expect(mounts).toHaveLength(1);
    spy.mockRestore();
  });
});
