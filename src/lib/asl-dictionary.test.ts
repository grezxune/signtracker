import { describe, expect, it } from "bun:test";
import { ASL_CATEGORIES, ASL_SIGNS } from "./asl-dictionary";

describe("ASL dictionary data", () => {
  it("contains at least 100 signs", () => {
    expect(ASL_SIGNS.length).toBeGreaterThanOrEqual(100);
  });

  it("has unique sign ids", () => {
    const ids = new Set(ASL_SIGNS.map((sign) => sign.id));
    expect(ids.size).toBe(ASL_SIGNS.length);
  });

  it("only uses known categories", () => {
    const knownCategories = new Set(ASL_CATEGORIES);
    for (const sign of ASL_SIGNS) {
      expect(knownCategories.has(sign.category)).toBe(true);
    }
  });
});
