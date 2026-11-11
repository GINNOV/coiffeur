import { describe, expect, it } from "vitest";
import { inspectPhoto, normalizeLikes, PHOTO_MAX_BYTES } from "./client-file";

describe("normalizeLikes", () => {
  it("trims lines and drops blanks", () => {
    const result = normalizeLikes(["  frangia lunga  ", "", "   "]);
    expect(result).toEqual({ ok: true, likes: ["frangia lunga"] });
  });

  it("refuses a line longer than 120 characters", () => {
    expect(normalizeLikes(["a".repeat(121)])).toEqual({ ok: false, code: "like_long" });
  });

  it("refuses more than 30 lines", () => {
    expect(normalizeLikes(Array.from({ length: 31 }, (_, index) => `n${index}`))).toEqual({
      ok: false,
      code: "like_many",
    });
  });
});

describe("inspectPhoto", () => {
  it("accepts a jpeg inside the limit", () => {
    expect(inspectPhoto("image/jpeg", 1200)).toEqual({ ok: true });
  });

  it("refuses a type the phone cannot show", () => {
    expect(inspectPhoto("image/heic", 1200)).toEqual({ ok: false, code: "photo_type" });
  });

  it("refuses a photo over 3 MB", () => {
    expect(inspectPhoto("image/png", PHOTO_MAX_BYTES + 1)).toEqual({ ok: false, code: "photo_big" });
  });
});
