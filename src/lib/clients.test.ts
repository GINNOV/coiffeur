import { describe, expect, it } from "vitest";
import { evaluateBooking } from "@/lib/booking";
import {
  applyClientNote,
  cardsAfterCreate,
  phoneDigits,
  phonesMatch,
  resolveVisitClient,
  searchClients,
  updateClientPhone,
  type ClientRecord,
} from "@/lib/clients";

const lia: ClientRecord = {
  id: "c1",
  name: "Lia",
  phone: "333 123 4567",
  phoneDigits: "3331234567",
  note: "",
  lastVisitDate: "2026-11-01",
};

describe("clients", () => {
  it("matches phones by digits only and never matches empty phones", () => {
    expect(phonesMatch("+39 333 123 4567", "3331234567")).toBe(true);
    expect(phonesMatch("", "")).toBe(false);
    expect(phonesMatch("abc", "")).toBe(false);
    expect(phoneDigits("+39 333 123 4567")).toBe("3331234567");
  });

  it("creates one card for a new name and refuses a digit-matching phone", () => {
    const created = resolveVisitClient({
      name: "Bea",
      phone: "3201111111",
      attachedClientId: null,
      clients: [lia],
    });
    expect(created.kind).toBe("create");
    const directory = cardsAfterCreate([lia], created, {
      ...lia,
      id: "c2",
      name: "Bea",
      phone: "3201111111",
      phoneDigits: "3201111111",
      lastVisitDate: null,
    });
    expect(directory).toHaveLength(2);

    const clash = resolveVisitClient({
      name: "Bea Due",
      phone: "+39 333 123 4567",
      attachedClientId: null,
      clients: directory,
    });
    expect(clash).toEqual({ kind: "phone_taken", existingId: "c1" });
    expect(cardsAfterCreate(directory, clash, lia)).toHaveLength(2);
  });

  it("allows two cards with the same name", () => {
    const second = resolveVisitClient({
      name: "Lia",
      phone: "",
      attachedClientId: null,
      clients: [lia],
    });
    expect(second.kind).toBe("create");
    const again = resolveVisitClient({
      name: "Lia",
      phone: "",
      attachedClientId: null,
      clients: [lia, { ...lia, id: "c2", phone: "", phoneDigits: "" }],
    });
    expect(again.kind).toBe("create");
  });

  it("creates no card when the visit has no name", () => {
    const plan = resolveVisitClient({
      name: "  ",
      phone: "3331234567",
      attachedClientId: null,
      clients: [],
    });
    expect(plan).toEqual({ kind: "none" });
    const booking = evaluateBooking(
      {
        stylistId: "s1",
        dateKey: "2026-11-10",
        start: "11:00",
        name: "",
        service: "colore",
      },
      [],
    );
    expect(booking).toMatchObject({ ok: true, link: "detach" });
  });

  it("keeps the same client id when the nota changes", () => {
    const appointment = { id: "v1", clientId: "c1" };
    const updated = applyClientNote({ id: "c1", note: "" }, "formula 7/1", appointment);
    expect(updated.client.id).toBe("c1");
    expect(updated.client.note).toBe("formula 7/1");
    expect(updated.appointment.clientId).toBe("c1");
  });

  it("refuses a card phone whose digits belong to another card", () => {
    const result = updateClientPhone(
      [lia, { id: "c2", phoneDigits: "3200000000" }],
      "c2",
      "+39 333 123 4567",
    );
    expect(result).toEqual({ ok: false, code: "phone_taken" });
    expect(updateClientPhone([lia], "c1", "333 123 4567")).toMatchObject({ ok: true });
  });

  it("detaches the client when the name is cleared and leaves the card", () => {
    const cards = [lia];
    const plan = resolveVisitClient({
      name: "",
      phone: "",
      attachedClientId: null,
      clients: cards,
    });
    expect(plan.kind).toBe("none");
    expect(cards).toEqual([lia]);
    const booking = evaluateBooking(
      {
        id: "v1",
        stylistId: "s1",
        dateKey: "2026-11-10",
        start: "11:00",
        name: "",
        service: "piega",
        updatedAt: "2026-11-10T08:00:00.000Z",
        storedUpdatedAt: "2026-11-10T08:00:00.000Z",
      },
      [],
    );
    expect(booking).toMatchObject({ ok: true, link: "detach" });
  });

  it("searches names without case and phones by digits, at most 8, with phone and last visit", () => {
    const clients: ClientRecord[] = Array.from({ length: 10 }, (_, index) => ({
      id: `c${index}`,
      name: index === 9 ? "Zoe" : `Maria ${index}`,
      phone: `333000000${index}`,
      phoneDigits: `333000000${index}`,
      note: "",
      lastVisitDate: `2026-11-${String(index + 1).padStart(2, "0")}`,
    }));
    const byName = searchClients(clients, "maria");
    expect(byName).toHaveLength(8);
    expect(byName[0].phone).toBeTruthy();
    expect(byName[0].lastVisitDate).toBeTruthy();
    expect(searchClients(clients, "MARIA 1")[0]?.name).toBe("Maria 1");
    expect(searchClients(clients, "3330000009")).toEqual([
      expect.objectContaining({ name: "Zoe", phone: "3330000009" }),
    ]);
    expect(searchClients(clients, "   ")).toEqual([]);
  });
});
