"use client";

import Link from "next/link";
import { useState } from "react";
import { DURATIONS } from "@/lib/booking";
import { WEEKDAY_LABELS, type TemplateKey } from "@/lib/catalog";
import { copy } from "@/lib/copy";

const fieldClass =
  "h-11 w-full rounded-lg border border-[#D4CFC6] bg-[#FDFBF7] px-3 text-[#1E3A5F] outline-none focus:border-[#C9A962] focus:ring-2 focus:ring-[#C9A962]/20";

export function AdminScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/impostazioni" className="text-xs tracking-[1.4px] text-[#6B5F5F] uppercase">
        {copy.settings}
      </Link>
      <h1 className="mt-3 font-serif text-4xl tracking-[-1px] text-[#1E3A5F]">{title}</h1>
      <p className="mt-2 text-[#6B5F5F]">{description}</p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function SaveBar({ pending, error, saved }: { pending: boolean; error: string | null; saved: boolean }) {
  return (
    <div className="mt-6">
      {error ? (
        <p className="mb-3 text-[#8d2f24]" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="mb-3 text-[#3C2F2F]">{copy.saved}</p> : null}
      <button type="submit" disabled={pending} className="min-h-12 rounded-lg bg-[#1E3A5F] px-6 text-white disabled:opacity-50">
        {copy.save}
      </button>
    </div>
  );
}

async function postJson(url: string, body: unknown): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return null;
    const payload: unknown = await response.json().catch(() => null);
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
      return payload.error;
    }
    return copy.offline;
  } catch {
    return copy.offline;
  }
}

export function ServicesForm({
  initial,
}: {
  initial: { name: string; durationMinutes: number }[];
}) {
  const [services, setServices] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    const next = await postJson("/api/servizi", { services });
    setError(next);
    setSaved(next == null);
    setPending(false);
  }

  return (
    <AdminScreen
      title="Servizi"
      description="Ogni servizio ha un nome e una durata. L'agenda continua a scrivere il nome del servizio sulla visita."
    >
      <form onSubmit={onSubmit}>
        {services.map((service, index) => (
          <div key={index} className="mb-3 grid grid-cols-[1fr_8rem_auto] gap-2">
            <input
              value={service.name}
              maxLength={60}
              aria-label={`Servizio ${index + 1}`}
              onChange={(event) =>
                setServices((current) =>
                  current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)),
                )
              }
              className={fieldClass}
            />
            <select
              value={service.durationMinutes}
              aria-label={`Durata ${index + 1}`}
              onChange={(event) =>
                setServices((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, durationMinutes: Number(event.target.value) } : item,
                  ),
                )
              }
              className={fieldClass}
            >
              {DURATIONS.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} min
                </option>
              ))}
            </select>
            <button
              type="button"
              className="min-h-11 px-3 text-sm text-[#6B5F5F]"
              onClick={() => setServices((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            >
              {copy.remove}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-[#1E3A5F]"
          onClick={() => setServices((current) => [...current, { name: "", durationMinutes: 30 }])}
        >
          Aggiungi un servizio
        </button>
        <SaveBar pending={pending} error={error} saved={saved} />
      </form>
    </AdminScreen>
  );
}

export function CalendarForm({
  weekdays,
  dates,
}: {
  weekdays: number[];
  dates: string[];
}) {
  const [closedDays, setClosedDays] = useState(weekdays);
  const [closedDates, setClosedDates] = useState(dates);
  const [nextDate, setNextDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    const next = await postJson("/api/calendario", { weekdays: closedDays, dates: closedDates });
    setError(next);
    setSaved(next == null);
    setPending(false);
  }

  return (
    <AdminScreen
      title="Calendario"
      description="Il salone risulta chiuso in questi giorni. Una visita in un giorno chiuso non si salva."
    >
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WEEKDAY_LABELS.map((label, index) => {
            const on = closedDays.includes(index);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setClosedDays((current) =>
                    current.includes(index) ? current.filter((day) => day !== index) : [...current, index],
                  )
                }
                className={`min-h-11 rounded-xl border px-3 text-sm ${
                  on ? "border-[#C9A962] bg-[#E8D5A3] text-[#1E3A5F]" : "border-[#EDEAE5] bg-white text-[#6B5F5F]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-8">
          <p className="mb-2 text-sm font-medium text-[#3C2F2F]">Date di chiusura</p>
          <div className="flex gap-2">
            <input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} className={fieldClass} />
            <button
              type="button"
              className="min-h-11 rounded-lg border border-[#EDEAE5] bg-white px-4 text-[#1E3A5F]"
              onClick={() => {
                if (!nextDate || closedDates.includes(nextDate)) return;
                setClosedDates((current) => [...current, nextDate].sort());
                setNextDate("");
              }}
            >
              Aggiungi
            </button>
          </div>
          <ul className="mt-3">
            {closedDates.map((date) => (
              <li key={date} className="flex items-center justify-between border-b border-[#EDEAE5] py-2 text-[#1E3A5F]">
                {date}
                <button
                  type="button"
                  className="text-sm text-[#6B5F5F]"
                  onClick={() => setClosedDates((current) => current.filter((item) => item !== date))}
                >
                  {copy.remove}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <SaveBar pending={pending} error={error} saved={saved} />
      </form>
    </AdminScreen>
  );
}

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  conferma: "Conferma appuntamento",
  promemoria: "Promemoria",
  compleanno: "Auguri di compleanno",
};

export function TemplatesForm({
  initial,
}: {
  initial: { key: TemplateKey; body: string }[];
}) {
  const [templates, setTemplates] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    const next = await postJson("/api/modelli", { templates });
    setError(next);
    setSaved(next == null);
    setPending(false);
  }

  return (
    <AdminScreen
      title="Modelli messaggi"
      description="Usa {{nome}}, {{quando}} e {{servizio}}. Questi sono i testi per i messaggi e per gli auguri."
    >
      <form onSubmit={onSubmit}>
        {templates.map((template) => (
          <label key={template.key} className="mb-5 block">
            <span className="mb-1 block text-sm font-medium text-[#3C2F2F]">{TEMPLATE_LABELS[template.key]}</span>
            <textarea
              value={template.body}
              maxLength={2000}
              rows={4}
              onChange={(event) =>
                setTemplates((current) =>
                  current.map((item) => (item.key === template.key ? { ...item, body: event.target.value } : item)),
                )
              }
              className="w-full rounded-lg border border-[#D4CFC6] bg-[#FDFBF7] px-3 py-2 text-[#1E3A5F] outline-none focus:border-[#C9A962] focus:ring-2 focus:ring-[#C9A962]/20"
            />
          </label>
        ))}
        <SaveBar pending={pending} error={error} saved={saved} />
      </form>
    </AdminScreen>
  );
}

export function KapsoForm({
  initial,
}: {
  initial: { apiKey: string; phoneNumberId: string; displayPhoneNumber: string };
}) {
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [phoneNumberId, setPhoneNumberId] = useState(initial.phoneNumberId);
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState(initial.displayPhoneNumber);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    const next = await postJson("/api/kapso", { apiKey, phoneNumberId, displayPhoneNumber });
    setError(next);
    setSaved(next == null);
    setPending(false);
  }

  return (
    <AdminScreen
      title="WhatsApp Kapso"
      description="Chiave API e identificativo del numero WhatsApp su Kapso. Le credenziali restano qui: i messaggi non partono ancora."
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <label>
          <span className="mb-1 block text-sm text-[#3C2F2F]">Chiave API</span>
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" className={fieldClass} />
        </label>
        <label>
          <span className="mb-1 block text-sm text-[#3C2F2F]">ID numero</span>
          <input
            value={phoneNumberId}
            onChange={(event) => setPhoneNumberId(event.target.value)}
            inputMode="numeric"
            className={fieldClass}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm text-[#3C2F2F]">Numero visibile</span>
          <input
            value={displayPhoneNumber}
            onChange={(event) => setDisplayPhoneNumber(event.target.value)}
            className={fieldClass}
          />
        </label>
        <SaveBar pending={pending} error={error} saved={saved} />
      </form>
    </AdminScreen>
  );
}

export function DownloadPanel({ title, description }: { title: string; description: string }) {
  return (
    <AdminScreen title={title} description={description}>
      <a
        href="/api/archivio"
        className="inline-flex min-h-12 items-center rounded-lg bg-[#1E3A5F] px-6 text-white"
      >
        Scarica il file
      </a>
    </AdminScreen>
  );
}

export function ImportForm() {
  const [confirm, setConfirm] = useState("");
  const [archive, setArchive] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    const next = await postJson("/api/archivio", { confirm, archive });
    setError(next);
    setSaved(next == null);
    setPending(false);
  }

  return (
    <AdminScreen
      title="Importa dati"
      description="Il file sostituisce clienti, visite, servizi, modelli, chiusure e Kapso. Il PIN resta quello attuale. Scrivi IMPORTA per confermare."
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <input
          type="file"
          accept="application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              try {
                setArchive(JSON.parse(String(reader.result)));
                setError(null);
              } catch {
                setArchive(null);
                setError(copy.writeName);
              }
            };
            reader.readAsText(file);
          }}
        />
        <input
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="IMPORTA"
          aria-label="Conferma importazione"
          className={fieldClass}
        />
        <SaveBar pending={pending} error={error} saved={saved} />
      </form>
    </AdminScreen>
  );
}
