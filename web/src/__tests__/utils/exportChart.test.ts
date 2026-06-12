import { beforeEach, describe, expect, it, vi } from "vitest";
import { toPng, toSvg } from "html-to-image";
import { exportChartAsPng, exportChartAsSvg } from "@/utils/exportChart";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
  toSvg: vi.fn(),
}));

function dataUrl(mime: string, body: string): string {
  return `data:${mime};base64,${btoa(body)}`;
}

describe("exportChart", () => {
  beforeEach(() => {
    vi.mocked(toPng).mockReset();
    vi.mocked(toSvg).mockReset();
  });

  it("exports a chart as PNG with a watermark wrapper", async () => {
    vi.mocked(toPng).mockResolvedValue(dataUrl("image/png", "png"));
    const el = document.createElement("div");

    const blob = await exportChartAsPng(el);

    expect(toPng).toHaveBeenCalledWith(el, expect.objectContaining({ pixelRatio: 2, cacheBust: true }));
    expect(blob.type).toBe("image/png");
    expect(el.textContent).not.toContain("MobileSec Observatory");
  });

  it("exports a chart as SVG", async () => {
    vi.mocked(toSvg).mockResolvedValue(dataUrl("image/svg+xml", "<svg />"));
    const el = document.createElement("div");

    const blob = await exportChartAsSvg(el);

    expect(toSvg).toHaveBeenCalledWith(el, expect.objectContaining({ cacheBust: true }));
    expect(blob.type).toBe("image/svg+xml");
  });
});
