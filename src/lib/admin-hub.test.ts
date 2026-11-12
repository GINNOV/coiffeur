import { describe, expect, it } from "vitest";
import { buildAdminCards, filterAdminCards, groupAdminCards, type AdminCard } from "@/lib/admin-hub";

const cards: AdminCard[] = [
  {
    href: "/impostazioni/poltrone",
    title: "Poltrone",
    description: "I nomi delle due poltrone.",
    section: "SALONE",
    mark: "1",
    badge: "2",
    badgeLabel: "POLTRONE",
  },
  {
    href: "/impostazioni/pin",
    title: "PIN",
    description: "Il codice a quattro cifre per entrare.",
    section: "SALONE",
    mark: "PIN",
  },
];

describe("admin hub", () => {
  it("keeps every card when the search is empty", () => {
    expect(filterAdminCards(cards, "  ")).toEqual(cards);
  });

  it("matches accent-free words across title and description", () => {
    expect(filterAdminCards(cards, "poltròne").map((card) => card.href)).toEqual([
      "/impostazioni/poltrone",
    ]);
    expect(filterAdminCards(cards, "quattro cifre").map((card) => card.href)).toEqual([
      "/impostazioni/pin",
    ]);
  });

  it("groups consecutive cards that share a section", () => {
    expect(groupAdminCards(cards)).toEqual([{ title: "SALONE", cards }]);
  });

  it("lists the salon admin cards in section order", () => {
    const hrefs = buildAdminCards({
      services: 0,
      closures: 2,
      templates: 3,
      kapsoConnected: false,
      stylists: 2,
    }).map((card) => card.href);
    expect(hrefs).toEqual([
      "/impostazioni/servizi",
      "/impostazioni/calendario",
      "/impostazioni/poltrone",
      "/impostazioni/modelli",
      "/impostazioni/whatsapp",
      "/impostazioni/backup",
      "/impostazioni/esporta",
      "/impostazioni/importa",
      "/impostazioni/pin",
    ]);
  });
});
