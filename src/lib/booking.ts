import { isClosed, isLegalStart, parseMinutes, type ClosureRules } from "@/lib/calendar";

export const DURATIONS = [30, 45, 60, 90, 120] as const;
export const DEFAULT_DURATION = 30;
export const DEFAULT_STATUS = "prenotato";
export const BLOCKING_STATUSES = ["prenotato", "in_salone", "fatto"] as const;

export type DurationMinutes = (typeof DURATIONS)[number];

export function isBlockingStatus(status: string): boolean {
  return (BLOCKING_STATUSES as readonly string[]).includes(status);
}

export function isDuration(value: number): value is DurationMinutes {
  return (DURATIONS as readonly number[]).includes(value);
}

export type OccupyingVisit = {
  id: string;
  stylistId: string;
  dateKey: string;
  start: string;
  durationMinutes: number;
  status: string;
};

export type VisitDraft = {
  id?: string | null;
  stylistId: string;
  dateKey: string;
  start: string;
  durationMinutes?: number;
  status?: string;
  name: string;
  service: string;
  updatedAt?: string | null;
  storedUpdatedAt?: string | null;
};

export type BookingCode = "occupied" | "closed" | "empty" | "stale";

export type BookingResult =
  | {
      ok: true;
      durationMinutes: DurationMinutes;
      status: string;
      link: "none" | "detach" | "resolve";
    }
  | { ok: false; code: BookingCode };

export function rangesOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
): boolean {
  return startA < startB + durationB && startB < startA + durationA;
}

export function evaluateBooking(
  draft: VisitDraft,
  existing: OccupyingVisit[],
  rules?: ClosureRules,
): BookingResult {
  if (draft.id) {
    if ((draft.updatedAt ?? null) !== (draft.storedUpdatedAt ?? null)) {
      return { ok: false, code: "stale" };
    }
  }

  const name = draft.name.trim();
  const service = draft.service.trim();
  if (!name && !service) return { ok: false, code: "empty" };

  if (isClosed(draft.dateKey, rules) || !isLegalStart(draft.start)) {
    return { ok: false, code: "closed" };
  }

  const durationMinutes = draft.durationMinutes ?? DEFAULT_DURATION;
  if (!isDuration(durationMinutes)) return { ok: false, code: "closed" };

  const status = draft.status && draft.status.length > 0 ? draft.status : DEFAULT_STATUS;
  const startMinute = parseMinutes(draft.start);
  if (startMinute == null) return { ok: false, code: "closed" };

  if (isBlockingStatus(status)) {
    for (const other of existing) {
      if (draft.id && other.id === draft.id) continue;
      if (other.stylistId !== draft.stylistId) continue;
      if (other.dateKey !== draft.dateKey) continue;
      if (!isBlockingStatus(other.status)) continue;
      const otherStart = parseMinutes(other.start);
      if (otherStart == null) continue;
      if (rangesOverlap(startMinute, durationMinutes, otherStart, other.durationMinutes)) {
        return { ok: false, code: "occupied" };
      }
    }
  }

  return {
    ok: true,
    durationMinutes,
    status,
    link: name ? "resolve" : "detach",
  };
}
