import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PDIDecompositionBar } from "@/components/charts/PDIDecompositionBar";
import type { PDITransition } from "@/types";

const transition: PDITransition = {
  from_version: "1.0.0",
  to_version: "1.1.0",
  from_release_date: "2026-01-01",
  to_release_date: "2026-02-01",
  components: { delta_d: 1, delta_s: 2, delta_c: 3, delta_e: 4 },
  pdi: 2,
  details: { new_dangerous_permissions: [], silent_expansion_groups: [], removed_permissions: [] },
};

describe("PDIDecompositionBar", () => {
  it("renders total PDI and empty state", () => {
    const { rerender } = render(<PDIDecompositionBar transition={transition} />);
    expect(screen.getByText(/总 PDI：2.1000/)).toBeInTheDocument();
    rerender(<PDIDecompositionBar />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });
});
