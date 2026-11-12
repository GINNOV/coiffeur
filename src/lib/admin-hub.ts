export type AdminCard = {
  href: string;
  title: string;
  description: string;
  section: string;
  mark: string;
  badge?: string;
  badgeLabel?: string;
};

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it").trim();
}

export function filterAdminCards(cards: readonly AdminCard[], query: string): AdminCard[] {
  const terms = normalizeSearch(query).split(/\s+/).filter((term) => term.length > 0);
  if (terms.length === 0) return [...cards];
  return cards.filter((card) => {
    const text = normalizeSearch(
      `${card.section} ${card.title} ${card.description} ${card.badgeLabel ?? ""}`,
    );
    return terms.every((term) => text.includes(term));
  });
}

export type AdminCounts = {
  services: number;
  closures: number;
  templates: number;
  kapsoConnected: boolean;
  stylists: number;
};

export function buildAdminCards(counts: AdminCounts): AdminCard[] {
  return [
    {
      href: "/impostazioni/servizi",
      section: "Anagrafiche",
      mark: "✂",
      title: "Servizi",
      badge: String(counts.services),
      badgeLabel: "servizi",
      description: "Nome e durata dei servizi. L'agenda scrive ancora il nome sulla visita.",
    },
    {
      href: "/impostazioni/calendario",
      section: "Anagrafiche",
      mark: "▦",
      title: "Calendario",
      badge: String(counts.closures),
      badgeLabel: "chiusure",
      description: "Giorni della settimana e date in cui il salone è chiuso.",
    },
    {
      href: "/impostazioni/poltrone",
      section: "Anagrafiche",
      mark: "1",
      title: "Poltrone",
      badge: String(counts.stylists),
      badgeLabel: "poltrone",
      description: "I nomi delle due poltrone, come compaiono sull'agenda.",
    },
    {
      href: "/impostazioni/modelli",
      section: "Messaggi",
      mark: "✉",
      title: "Modelli messaggi",
      badge: String(counts.templates),
      badgeLabel: "testi",
      description: "Testi automatici per la conferma, il promemoria e gli auguri di compleanno.",
    },
    {
      href: "/impostazioni/whatsapp",
      section: "Messaggi",
      mark: "WA",
      title: "WhatsApp Kapso",
      badge: counts.kapsoConnected ? "On" : "Off",
      description: "Collega il numero WhatsApp del salone tramite Kapso.",
    },
    {
      href: "/impostazioni/backup",
      section: "Manutenzione",
      mark: "DB",
      title: "Backup",
      description: "Scarica una copia completa di clienti, visite, servizi e modelli.",
    },
    {
      href: "/impostazioni/esporta",
      section: "Manutenzione",
      mark: "EXP",
      title: "Esporta dati",
      description: "Esporta il salone in un file JSON da conservare o spostare.",
    },
    {
      href: "/impostazioni/importa",
      section: "Manutenzione",
      mark: "IMP",
      title: "Importa dati",
      description: "Ripristina un backup o un'esportazione. Sostituisce i dati attuali.",
    },
    {
      href: "/impostazioni/pin",
      section: "Sicurezza",
      mark: "PIN",
      title: "PIN",
      description: "Il codice a quattro cifre per entrare da telefono.",
    },
  ];
}

export function groupAdminCards(cards: readonly AdminCard[]): { title: string; cards: AdminCard[] }[] {
  const sections: { title: string; cards: AdminCard[] }[] = [];
  for (const card of cards) {
    const last = sections.at(-1);
    if (last && last.title === card.section) last.cards.push(card);
    else sections.push({ title: card.section, cards: [card] });
  }
  return sections;
}
