"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LAST_START_MINUTES, legalStarts, parseMinutes } from "@/lib/calendar";
import { DURATIONS, DEFAULT_DURATION, DEFAULT_STATUS } from "@/lib/booking";
import { STATUS_CODES, copy, statusLabel } from "@/lib/copy";
import type { Clash, ClientHit, DayPayload, DayVisit, VisitPhotos } from "@/lib/types";
import { redirectIfUnauthorized } from "@/lib/unauthorized";
import { VisitPhotosFields } from "@/components/visit-photos";

const ROW_PX = 44;
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
    <main className="mx-auto max-w-3xl px-2 pb-8">
      <header className="sticky top-14 z-20 flex items-center gap-2 bg-[#f3efe6]/95 py-3 backdrop-blur">
        <Link
          href={`/giorno?d=${day.prev}`}
          className="grid h-12 w-12 place-items-center rounded-full bg-[#fffaf3] text-2xl"
          aria-label="Giorno precedente"
        >
          ‹
        </Link>
        <h1 className="flex-1 text-center font-serif text-lg leading-tight">{day.heading}</h1>
        <Link
          href={`/giorno?d=${day.next}`}
          className="grid h-12 w-12 place-items-center rounded-full bg-[#fffaf3] text-2xl"
          aria-label="Giorno successivo"
        >
          ›
        </Link>
      </header>
      {notice ? (
        <p className="mb-3 rounded-xl bg-[#9c3b2e] px-3 py-3 text-center text-white" role="alert">
          {notice}
        </p>
      ) : null}
      {day.closed ? (
        <p className="mt-16 text-center font-serif text-4xl text-[#9c3b2e]">{copy.closed}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {day.stylists.map((stylist) => (
            <Column
              key={stylist.id}
              name={stylist.name}
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
  visits,
  onWalkIn,
  onEmpty,
  onVisit,
}: {
  name: string;
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

  return (
    <section className="min-w-0 rounded-2xl bg-[#fffaf3] p-1.5 shadow-sm">
      <h2 className="truncate px-1 pb-1 text-center text-sm font-semibold">{name}</h2>
      <button
        type="button"
        onClick={onWalkIn}
        className="mb-2 min-h-12 w-full rounded-xl bg-[#f3efe6] px-1 text-sm font-medium"
      >
        {copy.walkIn}
      </button>
      <div className="relative" style={{ height: slots.length * ROW_PX }}>
        {slots.map((slot, index) => {
          const slotMinute = parseMinutes(slot) ?? 0;
          const className =
            "absolute right-0 left-0 border-t border-[#e7dccb] px-1 text-left text-[11px] text-[#8a7d6d]";
          const style = { top: index * ROW_PX, height: ROW_PX };
          if (slotMinute > LAST_START_MINUTES) {
            return (
              <div key={slot} className={className} style={style}>
                {slot}
              </div>
            );
          }
          return (
            <button
              key={slot}
              type="button"
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
              {slot}
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
              className="absolute right-1 left-8 z-20 truncate rounded border border-dashed border-[#8a7d6d] bg-[#fffaf3]/90 px-1 text-left text-[11px] line-through"
              style={{ top: ((start - OPEN_MINUTE) / 15) * ROW_PX + 16, height: 22 }}
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
              className={`absolute right-1 left-8 z-10 overflow-hidden rounded-lg px-1 py-1 text-left text-xs leading-tight text-white ${blockTone(visit.status)}`}
              style={{
                top: ((start - OPEN_MINUTE) / 15) * ROW_PX,
                height: Math.max((visit.durationMinutes / 15) * ROW_PX - 2, ROW_PX - 2),
              }}
            >
              {visit.clientName ? <span className="block truncate font-semibold">{visit.clientName}</span> : null}
              {visit.service ? <span className="block truncate opacity-90">{visit.service}</span> : null}
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

function blockTone(status: string): string {
  if (status === "in_salone") return "bg-[#9c3b2e]";
  if (status === "fatto") return "bg-[#2f4a3c]";
  return "bg-[#243246]";
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
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" role="presentation">
      <form
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fffaf3] px-4 pt-4 pb-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{sheet.start}</h2>
          <button type="button" onClick={onClose} className="min-h-12 rounded-full px-4 text-base">
            {copy.close}
          </button>
        </div>
        <label className="mb-3 block">
          <span className="text-sm font-medium">{copy.nome}</span>
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
            className="mt-1 min-h-12 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 text-lg"
            autoComplete="name"
          />
        </label>
        {results.length > 0 ? (
          <ul className="mb-3 overflow-hidden rounded-xl border border-[#e2d8c8]">
            {results.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => onAttach(hit)}
                  className="flex min-h-12 w-full flex-col items-start px-3 py-2 text-left hover:bg-[#f3efe6]"
                >
                  <span className="font-medium">{hit.name}</span>
                  <span className="text-sm text-[#5c5348]">
                    {hit.phone || "—"}
                    {hit.lastVisitDate ? ` · ${hit.lastVisitDate}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="mb-3 block">
          <span className="text-sm font-medium">{copy.telefono}</span>
          <input
            value={sheet.phone}
            readOnly={sheet.attached}
            onChange={(event) => onChange({ ...sheet, phone: event.target.value })}
            className="mt-1 min-h-12 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 text-lg read-only:bg-[#f3efe6]"
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
        {sheet.attached && sheet.clientId ? (
          <Link href={`/clienti/${sheet.clientId}`} className="mb-3 inline-flex min-h-12 items-center font-medium text-[#9c3b2e]">
            {copy.visits}
          </Link>
        ) : null}
        <label className="mb-3 block">
          <span className="text-sm font-medium">{copy.servizio}</span>
          <input
            value={sheet.service}
            onChange={(event) => onChange({ ...sheet, service: event.target.value })}
            className="mt-1 min-h-12 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 text-lg"
          />
        </label>
        <label className="mb-3 block">
          <span className="text-sm font-medium">{copy.request}</span>
          <textarea
            value={sheet.request}
            onChange={(event) => onChange({ ...sheet, request: event.target.value })}
            rows={3}
            className="mt-1 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 py-2 text-lg"
          />
        </label>
        <ClientLikes clientId={sheet.attached ? sheet.clientId : null} />
        <VisitPhotosFields
          visitId={sheet.id}
          photos={sheet.photos}
          onPhotos={(photos) => onChange({ ...sheet, photos })}
        />
        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-sm font-medium">Poltrona</span>
            <select
              value={sheet.stylistId}
              onChange={(event) => onChange({ ...sheet, stylistId: event.target.value })}
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e2d8c8] bg-white px-2"
            >
              {stylists.map((stylist) => (
                <option key={stylist.id} value={stylist.id}>
                  {stylist.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Ora</span>
            <select
              value={sheet.start}
              onChange={(event) => onChange({ ...sheet, start: event.target.value })}
              className="mt-1 min-h-12 w-full rounded-xl border border-[#e2d8c8] bg-white px-2"
            >
              {starts.map((start) => (
                <option key={start} value={start}>
                  {start}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mb-1 text-sm font-medium">{copy.durata}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {DURATIONS.map((duration) => (
            <button
              key={duration}
              type="button"
              onClick={() => onChange({ ...sheet, durationMinutes: duration })}
              className={`min-h-12 min-w-14 rounded-full px-3 ${sheet.durationMinutes === duration ? "bg-[#243246] text-white" : "bg-[#f3efe6]"}`}
            >
              {duration}
            </button>
          ))}
        </div>
        <p className="mb-1 text-sm font-medium">{copy.stato}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_CODES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onChange({ ...sheet, status })}
              className={`min-h-12 rounded-full px-3 ${sheet.status === status ? "bg-[#9c3b2e] text-white" : "bg-[#f3efe6]"}`}
            >
              {statusLabel(status)}
            </button>
          ))}
        </div>
        {notice ? <p className="mb-3 text-sm text-[#2f4a3c]">{notice}</p> : null}
        {error ? (
          <p className="mb-3 rounded-xl bg-[#f8e4df] px-3 py-3 text-[#9c3b2e]" role="alert">
            {error}
          </p>
        ) : null}
        {clash ? (
          <button type="button" onClick={onUseClash} className="mb-3 min-h-12 w-full rounded-xl border border-[#9c3b2e] font-medium text-[#9c3b2e]">
            {copy.useThisClient}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="min-h-14 w-full rounded-2xl bg-[#1e1a16] text-lg text-white disabled:opacity-60"
        >
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
    <div className="mb-3 rounded-xl bg-[#f3efe6] px-3 py-3">
      <p className="text-sm font-medium">{copy.likes}</p>
      <ul className="mt-1 list-disc pl-5">
        {likes.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
