import { DURATIONS, type DurationMinutes } from "@/lib/booking";

export const TEMPLATE_KEYS = ["conferma", "promemoria", "compleanno"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  conferma: "Ciao {{nome}}, ti aspettiamo {{quando}} per {{servizio}}.",
  promemoria: "Ciao {{nome}}, ti ricordiamo l'appuntamento di {{quando}}.",
  compleanno: "Tanti auguri {{nome}}. Quando vuoi, ti aspettiamo in salone.",
};

export const WEEKDAY_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
] as const;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}

export function parseServiceDraft(input: {
  name: string;
  durationMinutes: number;
}): { name: string; durationMinutes: DurationMinutes } | null {
  const name = input.name.trim();
  if (!name || name.length > 60) return null;
  if (!(DURATIONS as readonly number[]).includes(input.durationMinutes)) return null;
  return { name, durationMinutes: input.durationMinutes as DurationMinutes };
}

export function parseWeekdays(values: readonly number[]): number[] | null {
  const unique = [...new Set(values)];
  if (unique.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return null;
  return unique.sort((a, b) => a - b);
}

export function parseClosedDates(values: readonly string[]): string[] | null {
  const unique = [...new Set(values.map((value) => value.trim()))];
  if (unique.length > 400) return null;
  if (unique.some((value) => !DATE_KEY.test(value))) return null;
  return unique.sort();
}

export function parseTemplateBody(body: string): string | null {
  const text = body.trim();
  if (!text || text.length > 2000) return null;
  return text;
}

export function parseKapsoDraft(input: {
  apiKey: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
}): { apiKey: string; phoneNumberId: string; displayPhoneNumber: string } | null {
  const apiKey = input.apiKey.trim();
  const phoneNumberId = input.phoneNumberId.trim();
  const displayPhoneNumber = input.displayPhoneNumber.trim();
  if (apiKey.length > 200 || phoneNumberId.length > 40 || displayPhoneNumber.length > 40) return null;
  if (phoneNumberId && !/^\d+$/.test(phoneNumberId)) return null;
  return { apiKey, phoneNumberId, displayPhoneNumber };
}

export function kapsoIsConnected(setting: { apiKey: string; phoneNumberId: string } | null): boolean {
  return Boolean(setting?.apiKey && setting.phoneNumberId);
}
