import { describe, expect, it } from "vitest";
import { spearmanRank } from "@/utils/spearman";

describe("spearmanRank", () => {
  it("self correlation equals 1", () => {
    const a = [1, 2, 3, 4, 5];
    expect(spearmanRank(a, a)).toBeCloseTo(1, 6);
  });

  it("perfect negative correlation", () => {
    expect(spearmanRank([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 6);
  });

  it("handles tied ranks with average", () => {
    expect(spearmanRank([1, 1, 2, 3], [1, 1, 2, 3])).toBeCloseTo(1, 6);
  });

  it("throws on length mismatch", () => {
    expect(() => spearmanRank([1, 2], [1, 2, 3])).toThrow();
  });

  it("returns a value within [-1, 1] for arbitrary inputs", () => {
    const value = spearmanRank([3, 1, 4, 1, 5, 9], [2, 7, 1, 8, 2, 8]);
    expect(value).toBeGreaterThanOrEqual(-1);
    expect(value).toBeLessThanOrEqual(1);
  });
});
