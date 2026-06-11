import { describe, expect, it } from "vitest";
import { colors } from "@/design/colors";

describe("colors", () => {
  it("keeps the academic primary blue", () => {
    expect(colors.primary[500]).toBe("#003399");
  });
});
