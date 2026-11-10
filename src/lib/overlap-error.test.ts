import { describe, expect, it } from "vitest";
import { isOverlapError } from "@/lib/overlap-error";

describe("isOverlapError", () => {
  it("recognizes Prisma P2004 and exclusion constraint failures", () => {
    expect(isOverlapError({ code: "P2004", message: "constraint failed" })).toBe(true);
    expect(isOverlapError(new Error("exclusion constraint violation"))).toBe(true);
    expect(isOverlapError(new Error("ERROR: 23P01"))).toBe(true);
    expect(isOverlapError(new Error('constraint "Appointment_blocking_no_overlap"'))).toBe(true);
    expect(isOverlapError({ code: "P2002", message: "unique" })).toBe(false);
    expect(isOverlapError(new Error("connection reset"))).toBe(false);
  });
});
