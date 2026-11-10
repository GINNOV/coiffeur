import { describe, expect, it } from "vitest";
import {
  dayHeading,
  isClosed,
  legalStarts,
  timeInRome,
  walkInStart,
  zonedTimeToUtc,
} from "@/lib/calendar";

describe("calendar", () => {
  it("lists starts from 09:00 through 18:45 and not 19:00", () => {
    const starts = legalStarts();
    expect(starts[0]).toBe("09:00");
    expect(starts.at(-1)).toBe("18:45");
    expect(starts).not.toContain("19:00");
    expect(starts).toContain("18:30");
    expect(starts).toHaveLength(40);
  });

  it("closes Monday and Sunday in Europe/Rome", () => {
    expect(isClosed("2026-11-09")).toBe(true);
    expect(isClosed("2026-11-08")).toBe(true);
    expect(isClosed("2026-11-10")).toBe(false);
    expect(isClosed("2026-11-14")).toBe(false);
  });

  it("converts Rome civil times to explicit UTC instants", () => {
    expect(zonedTimeToUtc("2026-11-10", "09:00").toISOString()).toBe("2026-11-10T08:00:00.000Z");
    expect(zonedTimeToUtc("2026-11-10", "18:45").toISOString()).toBe("2026-11-10T17:45:00.000Z");
    expect(zonedTimeToUtc("2026-07-14", "09:00").toISOString()).toBe("2026-07-14T07:00:00.000Z");
    expect(timeInRome(new Date("2026-11-10T08:00:00.000Z"))).toBe("09:00");
    expect(dayHeading("2026-11-10")).toBe("martedì 10 novembre");
  });

  it("snaps a walk-in down to the Rome quarter-hour and refuses closed times", () => {
    expect(walkInStart(new Date("2026-11-10T08:10:00.000Z"))).toEqual({
      ok: true,
      dateKey: "2026-11-10",
      start: "09:00",
    });
    expect(walkInStart(new Date("2026-11-10T07:59:00.000Z"))).toEqual({ ok: false, code: "closed" });
    expect(walkInStart(new Date("2026-11-10T17:45:00.000Z"))).toEqual({
      ok: true,
      dateKey: "2026-11-10",
      start: "18:45",
    });
    expect(walkInStart(new Date("2026-11-10T17:46:00.000Z"))).toEqual({ ok: false, code: "closed" });
    expect(walkInStart(new Date("2026-11-08T09:00:00.000Z"))).toEqual({ ok: false, code: "closed" });
    expect(walkInStart(new Date("2026-11-09T10:00:00.000Z"))).toEqual({ ok: false, code: "closed" });
  });
});
