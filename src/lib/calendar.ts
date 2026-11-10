export const TIME_ZONE = "Europe/Rome";
export const OPEN_MINUTES = 9 * 60;
export const LAST_START_MINUTES = 18 * 60 + 45;
export const STEP_MINUTES = 15;

export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseMinutes(hhmm: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function legalStarts(): string[] {
  const starts: string[] = [];
  for (let minute = OPEN_MINUTES; minute <= LAST_START_MINUTES; minute += STEP_MINUTES) {
    starts.push(formatMinutes(minute));
  }
  return starts;
}

const LEGAL_STARTS = new Set(legalStarts());

export function isLegalStart(hhmm: string): boolean {
  return LEGAL_STARTS.has(hhmm);
}

export function isClosed(dateKey: string): boolean {
  const weekday = weekdayIndex(dateKey);
  return weekday === 0 || weekday === 1;
}

export function todayKey(now = new Date()): string {
  return dateKeyInRome(now);
}

export function dateKeyInRome(instant: Date): string {
  const parts = romeParts(instant);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function timeInRome(instant: Date): string {
  const parts = romeParts(instant);
  return `${parts.hour}:${parts.minute}`;
}

export function dayHeading(dateKey: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(zonedTimeToUtc(dateKey, "12:00"));
}

export function formatVisitWhen(instant: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return dateKeyInRome(new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0)));
}

export function walkInStart(
  now: Date,
): { ok: true; dateKey: string; start: string } | { ok: false; code: "closed" } {
  const dateKey = dateKeyInRome(now);
  if (isClosed(dateKey)) return { ok: false, code: "closed" };
  const parts = romeParts(now);
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  if (minutes < OPEN_MINUTES || minutes > LAST_START_MINUTES) {
    return { ok: false, code: "closed" };
  }
  const snapped = Math.floor(minutes / STEP_MINUTES) * STEP_MINUTES;
  return { ok: true, dateKey, start: formatMinutes(snapped) };
}

export function zonedTimeToUtc(dateKey: string, time: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = timeZoneOffsetMs(TIME_ZONE, utcGuess);
  const utc = new Date(utcGuess.getTime() - offset);
  const offsetAfter = timeZoneOffsetMs(TIME_ZONE, utc);
  if (offsetAfter !== offset) return new Date(utcGuess.getTime() - offsetAfter);
  return utc;
}

export function dayBounds(dateKey: string): { start: Date; end: Date } {
  return {
    start: zonedTimeToUtc(dateKey, "00:00"),
    end: zonedTimeToUtc(addDays(dateKey, 1), "00:00"),
  };
}

function weekdayIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(noonUtc);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[label] ?? -1;
}

function romeParts(instant: Date): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
} {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of formatted.formatToParts(instant)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = bag.hour;
  if (hour === "24") hour = "00";
  return {
    year: bag.year,
    month: bag.month,
    day: bag.day,
    hour,
    minute: bag.minute,
  };
}

function timeZoneOffsetMs(timeZone: string, date: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const bag: Record<string, string> = {};
  for (const part of formatted.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(bag.year),
    Number(bag.month) - 1,
    Number(bag.day),
    Number(bag.hour) % 24,
    Number(bag.minute),
    Number(bag.second),
  );
  return asUtc - date.getTime();
}
