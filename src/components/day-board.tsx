"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LAST_START_MINUTES, legalStarts, parseMinutes } from "@/lib/calendar";
import { DURATIONS, DEFAULT_DURATION, DEFAULT_STATUS } from "@/lib/booking";
import { STATUS_CODES, copy, statusLabel } from "@/lib/copy";
import type { Clash, ClientHit, DayPayload, DayVisit, VisitPhotos } from "@/lib/types";
import { redirectIfUnauthorized } from "@/lib/unauthorized";
import { ReferencePhotos } from "@/components/reference-photos";
import { VisitPhotosFields } from "@/components/visit-photos";

const ROW_PX = 36;
const OPEN_MINUTE = 9 * 60;

type Sheet = {
  id: string | null;
  stylistId: string;
  start: string;
  name: string;
  phone: string;
  service: string;
  request: string;
  durationMinutes: number;
  status: string;
  clientId: string | null;
  attached: boolean;
  updatedAt: string | null;
  photos: VisitPhotos;
};

function blankSheet(stylistId: string, start: string): Sheet {
  return {
    id: null,
    stylistId,
    start,
    name: "",
    phone: "",
    service: "",
    request: "",
    durationMinutes: DEFAULT_DURATION,
    status: DEFAULT_STATUS,
    clientId: null,
    attached: false,
    updatedAt: null,
    photos: { prima: null, dopo: null },
  };
}

function sheetFromVisit(visit: DayVisit): Sheet {
  return {
    id: visit.id,
    stylistId: visit.stylistId,
    start: visit.start,
    name: visit.clientName,
    phone: visit.phone,
    service: visit.service,
    request: visit.request,
    durationMinutes: visit.durationMinutes,
    status: visit.status,
    clientId: visit.clientId,
    attached: Boolean(visit.clientId),
    updatedAt: visit.updatedAt,
    photos: visit.photos,
  };
}

export function DayBoard({
  initialDay,
  seed,
}: {
  initialDay: DayPayload;
  seed: { stylistId: string; start: string } | null;
}) {
  const router = useRouter();
  const [day, setDay] = useState(initialDay);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clash, setClash] = useState<Clash | null>(null);
  const [results, setResults] = useState<ClientHit[]>([]);
  const [pending, setPending] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !seed || initialDay.closed) return;
    seeded.current = true;
    setSheet(blankSheet(seed.stylistId, seed.start));
  }, [seed, initialDay.closed]);

  useEffect(() => {
    let stop = false;
    async function reload() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/giorno?d=${day.dateKey}`, { cache: "no-store" });
        if (redirectIfUnauthorized(response.status)) return;
        if (!response.ok) return;
        const next = (await response.json()) as DayPayload;
        if (!stop) setDay(next);
      } catch {
        // A failed poll is not an edit.
      }
    }
    const id = window.setInterval(reload, 10_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [day.dateKey]);

  useEffect(() => {
    if (!sheet || sheet.attached) {
      setResults([]);
      return;
    }
    const query = sheet.name.trim();
    if (!query) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/clienti?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
        });
        if (redirectIfUnauthorized(response.status)) return;
        if (!response.ok) return;
        const body = (await response.json()) as { clients: ClientHit[] };
        setResults(body.clients.slice(0, 8));
      } catch {
        setResults([]);
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [sheet]);

  async function reloadDay() {
    const response = await fetch(`/api/giorno?d=${day.dateKey}`, { cache: "no-store" });
    if (redirectIfUnauthorized(response.status)) return;
    if (!response.ok) return;
    setDay((await response.json()) as DayPayload);
  }

  async function walkIn(stylistId: string) {
    setNotice(null);
    try {
      const response = await fetch("/api/walk-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stylistId }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        dateKey?: string;
        start?: string;
      };
      if (redirectIfUnauthorized(response.status)) return;
      if (!response.ok || !body.dateKey || !body.start) {
        setNotice(body.error ?? copy.closed);
        return;
      }
      if (body.dateKey !== day.dateKey) {
        router.push(`/giorno?d=${body.dateKey}&start=${body.start}&stylist=${stylistId}`);
        return;
      }
      setError(null);
      setClash(null);
      setSaved(false);
      setSheet(blankSheet(stylistId, body.start));
    } catch {
      setNotice(copy.offline);
    }
  }

  function attach(hit: ClientHit) {
    setSheet((current) =>
      current
        ? {
            ...current,
            name: hit.name,
            phone: hit.phone,
            clientId: hit.id,
            attached: true,
          }
        : current,
    );
    setClash(null);
    setError(null);
    setResults([]);
  }

  async function save() {
    if (!sheet || day.closed) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/appuntamenti", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: sheet.id,
          stylistId: sheet.stylistId,
          dateKey: day.dateKey,
          start: sheet.start,
          durationMinutes: sheet.durationMinutes,
          status: sheet.status,
          name: sheet.name,
          phone: sheet.phone,
          service: sheet.service,
          request: sheet.request,
          clientId: sheet.attached ? sheet.clientId : null,
          updatedAt: sheet.updatedAt,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        clash?: Clash;
        visit?: DayVisit;
      };
      if (redirectIfUnauthorized(response.status)) return;
      if (!response.ok) {
        setError(body.error ?? copy.offline);
        if (body.clash) setClash(body.clash);
        if (body.visit) {
          setSheet(sheetFromVisit(body.visit));
          setClash(null);
        }
        await reloadDay();
        return;
      }
      if (body.visit) setSheet(sheetFromVisit(body.visit));
      setSaved(true);
      setNotice(null);
      setClash(null);
      await reloadDay();
    } catch {
      setError(copy.offline);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-3 pb-10">
      <header className="sticky top-14 z-20 flex items-end gap-2 bg-[var(--paper)] py-3">
        <Link href={`/giorno?d=${day.prev}`} className="grid h-12 w-10 place-items-center font-serif text-3xl" aria-label="Giorno precedente">
          ‹
        </Link>
        <h1 className="flex-1 text-center font-serif text-2xl leading-none">{day.heading}</h1>
        <Link href={`/giorno?d=${day.next}`} className="grid h-12 w-10 place-items-center font-serif text-3xl" aria-label="Giorno successivo">
          ›
        </Link>
      </header>
      {notice ? (
        <p className="mb-3 px-2 text-center text-[var(--alert)]" role="alert">
          {notice}
        </p>
      ) : null}
      {day.closed ? (
        <p className="mt-16 text-center font-serif text-5xl">{copy.closed}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-1">
          {day.stylists.map((stylist, index) => (
            <Column
              key={stylist.id}
              name={stylist.name}
              chair={index % 2 === 0 ? "a" : "b"}
              visits={stylist.visits}
              onWalkIn={() => void walkIn(stylist.id)}
              onEmpty={(start) => {
                setError(null);
                setClash(null);
                setSaved(false);
                setNotice(null);
                setSheet(blankSheet(stylist.id, start));
              }}
              onVisit={(visit) => {
                setError(null);
                setClash(null);
                setSaved(false);
                setNotice(null);
                setSheet(sheetFromVisit(visit));
              }}
            />
          ))}
        </div>
      )}
      {sheet && !day.closed ? (
        <AppointmentSheet
          sheet={sheet}
          stylists={day.stylists.map((stylist) => ({ id: stylist.id, name: stylist.name }))}
          results={results}
          error={error}
          notice={saved ? copy.saved : null}
          clash={clash}
          pending={pending}
          onChange={(next) => {
            if (sheet && (next.name !== sheet.name || next.phone !== sheet.phone)) setClash(null);
            setSheet(next);
          }}
          onAttach={attach}
          onUseClash={() => {
            if (!clash) return;
            attach({ id: clash.id, name: clash.name, phone: clash.phone, lastVisitDate: null });
          }}
          onClose={() => {
            setSheet(null);
            setNotice(null);
            setSaved(false);
            setError(null);
            setClash(null);
          }}
          onSave={() => void save()}
        />
      ) : null}
    </main>
  );
}

function Column({
  name,
  chair,
  visits,
  onWalkIn,
  onEmpty,
  onVisit,
}: {
  name: string;
  chair: "a" | "b";
  visits: DayVisit[];
  onWalkIn: () => void;
  onEmpty: (start: string) => void;
  onVisit: (visit: DayVisit) => void;
}) {
  const endMinute = useMemo(() => {
    let end = 19 * 60;
    for (const visit of visits) {
      const start = parseMinutes(visit.start) ?? OPEN_MINUTE;
      end = Math.max(end, start + visit.durationMinutes);
    }
    return end;
  }, [visits]);
  const slots: string[] = [];
  for (let minute = OPEN_MINUTE; minute < endMinute; minute += 15) {
    const hours = Math.floor(minute / 60);
    const mins = minute % 60;
    slots.push(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
  }
  const blocking = visits.filter((visit) =>
    visit.status === "prenotato" || visit.status === "in_salone" || visit.status === "fatto",
  );
  const quiet = visits.filter((visit) => !blocking.includes(visit));

  const ink = chair === "a" ? "var(--chair-a)" : "var(--chair-b)";
  return (
    <section className="min-w-0">
      <h2 className="truncate px-1 pb-1 font-serif text-lg" style={{ borderBottom: `2px solid ${ink}` }}>
        {name}
      </h2>
      <button type="button" onClick={onWalkIn} className="min-h-11 w-full px-1 text-left text-sm text-[var(--quiet)]">
        + {copy.walkIn}
      </button>
      <div className="relative" style={{ height: slots.length * ROW_PX }}>
        {slots.map((slot, index) => {
          const slotMinute = parseMinutes(slot) ?? 0;
          const hour = slot.endsWith(":00");
          const className = `absolute right-0 left-0 border-t px-0.5 text-left text-[11px] ${hour ? "border-[var(--rule)] text-[var(--quiet)]" : "border-[var(--rule)]/40 text-transparent"}`;
          const style = { top: index * ROW_PX, height: ROW_PX };
          const mark = hour ? slot.slice(0, 2) : "";
          if (slotMinute > LAST_START_MINUTES) {
            return (
              <div key={slot} className={className} style={style}>
                {mark}
              </div>
            );
          }
          return (
            <button
              key={slot}
              type="button"
              aria-label={slot}
              onClick={() => {
                const cover = blocking.find((visit) => {
                  const start = parseMinutes(visit.start) ?? 0;
                  return slotMinute >= start && slotMinute < start + visit.durationMinutes;
                });
                if (cover) onVisit(cover);
                else onEmpty(slot);
              }}
              className={className}
              style={style}
            >
              {mark}
            </button>
          );
        })}
        {quiet.map((visit) => {
          const start = parseMinutes(visit.start) ?? OPEN_MINUTE;
          return (
            <button
              key={visit.id}
              type="button"
              onClick={() => onVisit(visit)}
              className="absolute right-0 left-6 z-20 truncate px-1 text-left text-xs text-[var(--quiet)] line-through"
              style={{ top: ((start - OPEN_MINUTE) / 15) * ROW_PX + 4, height: 28 }}
            >
              {labelFor(visit)}
            </button>
          );
        })}
        {blocking.map((visit) => {
          const start = parseMinutes(visit.start) ?? OPEN_MINUTE;
          return (
            <button
              key={visit.id}
              type="button"
              onClick={() => onVisit(visit)}
              className={`absolute right-0 left-6 z-10 overflow-hidden px-1.5 py-1 text-left leading-tight ${blockTone(visit.status, chair)}`}
              style={{
                top: ((start - OPEN_MINUTE) / 15) * ROW_PX,
                height: Math.max((visit.durationMinutes / 15) * ROW_PX - 3, ROW_PX - 3),
              }}
            >
              {visit.clientName ? <span className="block truncate font-serif text-sm">{visit.clientName}</span> : null}
              {visit.service ? <span className="block truncate text-[11px] opacity-80">{visit.service}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function labelFor(visit: DayVisit): string {
  return [visit.clientName, visit.service].filter(Boolean).join(" · ");
}

function blockTone(status: string, chair: "a" | "b"): string {
  if (status === "in_salone") return "bg-[#111] text-white";
  if (status === "fatto") return chair === "a" ? "bg-[var(--done-a)] text-[var(--chair-a)]" : "bg-[var(--done-b)] text-[var(--chair-b)]";
  return chair === "a" ? "bg-[var(--chair-a)] text-white" : "bg-[var(--chair-b)] text-white";
}

function AppointmentSheet({
  sheet,
  stylists,
  results,
  error,
  notice,
  clash,
  pending,
  onChange,
  onAttach,
  onUseClash,
  onClose,
  onSave,
}: {
  sheet: Sheet;
  stylists: { id: string; name: string }[];
  results: ClientHit[];
  error: string | null;
  notice: string | null;
  clash: Clash | null;
  pending: boolean;
  onChange: (sheet: Sheet) => void;
  onAttach: (hit: ClientHit) => void;
  onUseClash: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const starts = legalStarts();
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#15211c]/40" role="presentation">
      <form
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto bg-[var(--sheet)] px-5 pt-4 pb-8"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-3xl">{sheet.start}</h2>
          <button type="button" onClick={onClose} className="min-h-12 px-2 text-base">
            {copy.close}
          </button>
        </div>
        <label className="mb-2 block">
          <span className="sr-only">{copy.nome}</span>
          <input
            value={sheet.name}
            onChange={(event) =>
              onChange({
                ...sheet,
                name: event.target.value,
                attached: false,
                clientId: null,
              })
            }
            placeholder={copy.nome}
            className="line-name"
            autoComplete="name"
          />
        </label>
        {sheet.attached && sheet.clientId ? <ReferencePhotos clientId={sheet.clientId} /> : null}
        {results.length > 0 ? (
          <ul className="mb-3 border-t border-[var(--rule)]">
            {results.map((hit) => (
              <li key={hit.id} className="border-b border-[var(--rule)]">
                <button type="button" onClick={() => onAttach(hit)} className="flex min-h-12 w-full flex-col items-start py-2 text-left">
                  <span className="font-serif text-lg">{hit.name}</span>
                  <span className="text-sm text-[var(--quiet)]">
                    {hit.phone || "—"}
                    {hit.lastVisitDate ? ` ${hit.lastVisitDate}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="mb-3 block">
          <span className="sr-only">{copy.telefono}</span>
          <input
            value={sheet.phone}
            readOnly={sheet.attached}
            onChange={(event) => onChange({ ...sheet, phone: event.target.value })}
            placeholder={copy.telefono}
            className="line"
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
        {sheet.attached && sheet.clientId ? (
          <Link href={`/clienti/${sheet.clientId}`} className="mb-4 inline-flex min-h-11 items-center underline decoration-[var(--rule)] underline-offset-4">
            {copy.card}
          </Link>
        ) : null}
        <label className="mb-3 block">
          <span className="sr-only">{copy.servizio}</span>
          <input
            value={sheet.service}
            onChange={(event) => onChange({ ...sheet, service: event.target.value })}
            placeholder={copy.servizio}
            className="line"
          />
        </label>
        <label className="mb-3 block">
          <span className="sr-only">{copy.request}</span>
          <textarea
            value={sheet.request}
            onChange={(event) => onChange({ ...sheet, request: event.target.value })}
            rows={2}
            placeholder={copy.request}
            className="line"
          />
        </label>
        <ClientLikes clientId={sheet.attached ? sheet.clientId : null} />
        <VisitPhotosFields
          visitId={sheet.id}
          photos={sheet.photos}
          onPhotos={(photos) => onChange({ ...sheet, photos })}
        />
        <div className="mb-4 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-[var(--quiet)]">Poltrona</span>
            <select
              value={sheet.stylistId}
              onChange={(event) => onChange({ ...sheet, stylistId: event.target.value })}
              className="line"
            >
              {stylists.map((stylist) => (
                <option key={stylist.id} value={stylist.id}>
                  {stylist.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-[var(--quiet)]">Ora</span>
            <select value={sheet.start} onChange={(event) => onChange({ ...sheet, start: event.target.value })} className="line">
              {starts.map((start) => (
                <option key={start} value={start}>
                  {start}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          {DURATIONS.map((duration) => (
            <button
              key={duration}
              type="button"
              onClick={() => onChange({ ...sheet, durationMinutes: duration })}
              className={`choice ${sheet.durationMinutes === duration ? "choice-on" : ""}`}
            >
              {duration}
            </button>
          ))}
        </div>
        <div className="mb-5 flex flex-wrap gap-1">
          {STATUS_CODES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onChange({ ...sheet, status })}
              className={`choice ${sheet.status === status ? "choice-on" : ""}`}
            >
              {statusLabel(status)}
            </button>
          ))}
        </div>
        {notice ? <p className="mb-3 text-sm">{notice}</p> : null}
        {error ? (
          <p className="mb-3 text-[var(--alert)]" role="alert">
            {error}
          </p>
        ) : null}
        {clash ? (
          <button type="button" onClick={onUseClash} className="mb-3 min-h-12 w-full text-left font-medium text-[var(--alert)]">
            {copy.useThisClient}
          </button>
        ) : null}
        <button type="submit" disabled={pending} className="save">
          {copy.save}
        </button>
      </form>
    </div>
  );
}

function ClientLikes({ clientId }: { clientId: string | null }) {
  const [likes, setLikes] = useState<string[]>([]);

  useEffect(() => {
    if (!clientId) {
      setLikes([]);
      return;
    }
    let stop = false;
    void fetch(`/api/clienti/${clientId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { likes?: string[] };
        if (!stop) setLikes(body.likes ?? []);
      })
      .catch(() => {
        if (!stop) setLikes([]);
      });
    return () => {
      stop = true;
    };
  }, [clientId]);

  if (!clientId || likes.length === 0) return null;
  return (
    <div className="mb-4 border-t border-[var(--rule)] pt-3">
      <p className="text-sm text-[var(--quiet)]">{copy.likes}</p>
      <ul className="mt-1 list-disc pl-5">
        {likes.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
