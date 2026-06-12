import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchExportButton } from "@/components/charts/BatchExportButton";
import { PAPER_FIGURE_EXPORT_NAMES } from "@/components/charts/paperFigureManifest";
import { useExportRegistry } from "@/store/exportRegistry";
import { downloadBlob, exportChartAsPng, exportChartAsSvg } from "@/utils/exportChart";

vi.mock("@/components/charts/PaperFigureExportSurface", async () => {
  const React = await import("react");
  const { PAPER_FIGURE_EXPORT_NAMES } = await import("@/components/charts/paperFigureManifest");
  const { useExportRegistry } = await import("@/store/exportRegistry");

  return {
    PaperFigureExportSurface: function MockPaperFigureExportSurface() {
      const register = useExportRegistry((state) => state.register);
      React.useEffect(() => {
        PAPER_FIGURE_EXPORT_NAMES.forEach((exportName) => {
          register({
            exportName,
            title: exportName,
            ref: { current: document.createElement("div") },
          });
        });
      }, [register]);
      return React.createElement("div", { "data-testid": "paper-figure-export-surface" });
    },
  };
});

vi.mock("@/utils/exportChart", () => ({
  downloadBlob: vi.fn(),
  exportChartAsPng: vi.fn(),
  exportChartAsSvg: vi.fn(),
}));

function registerChart(exportName: string, title: string) {
  const ref = { current: document.createElement("div") };
  useExportRegistry.getState().register({ exportName, title, ref });
}

describe("BatchExportButton", () => {
  beforeEach(() => {
    useExportRegistry.setState({ entries: [] });
    vi.mocked(downloadBlob).mockReset();
    vi.mocked(exportChartAsPng).mockReset();
    vi.mocked(exportChartAsSvg).mockReset();
    vi.mocked(exportChartAsPng).mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    vi.mocked(exportChartAsSvg).mockResolvedValue(new Blob(["svg"], { type: "image/svg+xml" }));
  });

  it("packages selected charts into a zip with ASCII file names", async () => {
    registerChart("chart_a", "Chart A");
    registerChart("chart_b", "Chart B");
    render(<BatchExportButton includeAllPages={false} />);

    fireEvent.click(screen.getByRole("button", { name: /导出全部论文图/ }));
    fireEvent.change(screen.getByLabelText(/文件前缀/), { target: { value: "paper_figs" } });
    fireEvent.click(screen.getByRole("button", { name: "开始导出" }));

    await waitFor(() => expect(downloadBlob).toHaveBeenCalled());
    const zipBlob = vi.mocked(downloadBlob).mock.calls[0][0] as Blob;
    const zip = await JSZip.loadAsync(zipBlob);

    expect(Object.keys(zip.files).sort()).toEqual(["01_chart_a.png", "02_chart_b.png"]);
    expect(vi.mocked(downloadBlob).mock.calls[0][1]).toBe("paper_figs.zip");
  });

  it("shows progress while exporting three selected charts", async () => {
    let resolveFirst: (blob: Blob) => void = () => undefined;
    vi.mocked(exportChartAsPng).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    registerChart("one", "One");
    registerChart("two", "Two");
    registerChart("three", "Three");
    render(<BatchExportButton includeAllPages={false} />);

    fireEvent.click(screen.getByRole("button", { name: /导出全部论文图/ }));
    fireEvent.click(screen.getByRole("button", { name: "开始导出" }));

    expect(await screen.findByText("正在导出 1 / 3")).toBeInTheDocument();
    resolveFirst(new Blob(["png"], { type: "image/png" }));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalled());
  });

  it("mounts the all-page export surface before enabling export", async () => {
    render(<BatchExportButton />);

    fireEvent.click(screen.getByRole("button", { name: /导出全部论文图/ }));

    expect(screen.getByTestId("paper-figure-export-surface")).toBeInTheDocument();
    expect(await screen.findByText(`已准备 ${PAPER_FIGURE_EXPORT_NAMES.length} 张图表`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始导出" })).toBeEnabled();
  });
});
