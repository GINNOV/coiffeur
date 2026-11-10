import { describe, expect, it } from "vitest";
import { evaluateBooking, type OccupyingVisit, type VisitDraft } from "@/lib/booking";

const base: VisitDraft = {
  stylistId: "s1",
  dateKey: "2026-11-10",
  start: "10:00",
  durationMinutes: 30,
  status: "prenotato",
  name: "Ada",
  service: "taglio",
};

function visit(overrides: Partial<OccupyingVisit>): OccupyingVisit {
  return {
    id: "other",
    stylistId: "s1",
    dateKey: "2026-11-10",
    start: "10:00",
    durationMinutes: 60,
    status: "prenotato",
    ...overrides,
  };
}

describe("booking", () => {
  it("refuses overlapping blocking visits on the same stylist", () => {
    const result = evaluateBooking(base, [visit({ start: "10:15", durationMinutes: 30 })]);
    expect(result).toEqual({ ok: false, code: "occupied" });
  });

  it("accepts the same times on the other stylist", () => {
    const result = evaluateBooking(base, [
      visit({ stylistId: "s2", start: "10:00", durationMinutes: 60 }),
    ]);
    expect(result.ok).toBe(true);
  });

  it("accepts a visit that starts when another ends at 10:30", () => {
    const result = evaluateBooking(
      { ...base, start: "10:30" },
      [visit({ start: "09:00", durationMinutes: 90 })],
    );
    expect(result.ok).toBe(true);
  });

  it("lets annullato and non_venuto free the slot while fatto still blocks", () => {
    expect(
      evaluateBooking(base, [visit({ status: "annullato" })]).ok,
    ).toBe(true);
    expect(
      evaluateBooking(base, [visit({ status: "non_venuto" })]).ok,
    ).toBe(true);
    expect(evaluateBooking(base, [visit({ status: "fatto" })])).toEqual({
      ok: false,
      code: "occupied",
    });
    expect(
      evaluateBooking(
        { ...base, status: "annullato" },
        [visit({ status: "prenotato" })],
      ).ok,
    ).toBe(true);
  });

  it("refuses Monday, Sunday, a start before 09:00, and a start at 19:00", () => {
    expect(evaluateBooking({ ...base, dateKey: "2026-11-09" }, [])).toEqual({
      ok: false,
      code: "closed",
    });
    expect(evaluateBooking({ ...base, dateKey: "2026-11-08" }, [])).toEqual({
      ok: false,
      code: "closed",
    });
    expect(evaluateBooking({ ...base, start: "08:45" }, [])).toEqual({
      ok: false,
      code: "closed",
    });
    expect(evaluateBooking({ ...base, start: "19:00" }, [])).toEqual({
      ok: false,
      code: "closed",
    });
  });

  it("accepts 18:30 with a duration of 60 minutes", () => {
    const result = evaluateBooking(
      { ...base, start: "18:30", durationMinutes: 60, service: "" },
      [],
    );
    expect(result).toMatchObject({ ok: true, durationMinutes: 60 });
  });

  it("refuses an update whose updatedAt does not match", () => {
    const result = evaluateBooking(
      {
        ...base,
        id: "v1",
        updatedAt: "2026-11-10T08:00:00.000Z",
        storedUpdatedAt: "2026-11-10T09:00:00.000Z",
      },
      [],
    );
    expect(result).toEqual({ ok: false, code: "stale" });
  });

  it("ignores the visit being saved when checking overlap", () => {
    const result = evaluateBooking(
      {
        ...base,
        id: "v1",
        updatedAt: "2026-11-10T08:00:00.000Z",
        storedUpdatedAt: "2026-11-10T08:00:00.000Z",
      },
      [visit({ id: "v1" })],
    );
    expect(result.ok).toBe(true);
  });

  it("refuses a visit with neither name nor service", () => {
    expect(evaluateBooking({ ...base, name: "  ", service: "" }, [])).toEqual({
      ok: false,
      code: "empty",
    });
  });

  it("detaches the client when the name is cleared but the service remains", () => {
    const result = evaluateBooking(
      {
        ...base,
        id: "v1",
        name: "",
        service: "piega",
        updatedAt: "2026-11-10T08:00:00.000Z",
        storedUpdatedAt: "2026-11-10T08:00:00.000Z",
      },
      [],
    );
    expect(result).toMatchObject({ ok: true, link: "detach" });
  });
});
