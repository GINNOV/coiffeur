import { DURATIONS } from "@/lib/booking";
import {
  isTemplateKey,
  parseClosedDates,
  parseKapsoDraft,
  parseTemplateBody,
  parseWeekdays,
  TEMPLATE_KEYS,
  type TemplateKey,
} from "@/lib/catalog";

export const ARCHIVE_VERSION = 1;

export type ArchivePhoto = {
  kind: "prima" | "dopo";
  contentType: string;
  bytesBase64: string;
};

export type ArchiveFile = {
  version: typeof ARCHIVE_VERSION;
  closures: { weekdays: number[]; dates: string[] };
  services: { name: string; durationMinutes: number; position: number }[];
  templates: { key: TemplateKey; body: string }[];
  kapso: { apiKey: string; phoneNumberId: string; displayPhoneNumber: string } | null;
  clients: { id: string; name: string; phone: string; note: string; likes: string[] }[];
  appointments: {
    id: string;
    stylistPosition: number;
    clientId: string | null;
    startsAt: string;
    durationMinutes: number;
    service: string;
    request: string;
    status: string;
    photos: ArchivePhoto[];
  }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

export function parseArchive(value: unknown): ArchiveFile | null {
  if (!isRecord(value) || value.version !== ARCHIVE_VERSION) return null;
  if (!isRecord(value.closures)) return null;
  if (!Array.isArray(value.closures.weekdays) || !Array.isArray(value.closures.dates)) return null;
  if (!value.closures.weekdays.every((day) => typeof day === "number")) return null;
  if (!value.closures.dates.every((day) => typeof day === "string")) return null;
  const weekdays = parseWeekdays(value.closures.weekdays);
  const dates = parseClosedDates(value.closures.dates);
  if (!weekdays || !dates) return null;

  if (!Array.isArray(value.services) || !Array.isArray(value.templates) || !Array.isArray(value.clients)) {
    return null;
  }
  if (!Array.isArray(value.appointments)) return null;

  const services: ArchiveFile["services"] = [];
  for (const item of value.services) {
    if (!isRecord(item)) return null;
    const name = stringField(item, "name")?.trim() ?? "";
    const durationMinutes = item.durationMinutes;
    const position = item.position;
    if (!name || name.length > 60) return null;
    if (typeof durationMinutes !== "number" || !(DURATIONS as readonly number[]).includes(durationMinutes)) return null;
    if (typeof position !== "number" || !Number.isInteger(position)) return null;
    services.push({ name, durationMinutes, position });
  }

  const templates: ArchiveFile["templates"] = [];
  for (const item of value.templates) {
    if (!isRecord(item)) return null;
    const key = stringField(item, "key") ?? "";
    const body = stringField(item, "body");
    if (!isTemplateKey(key) || body == null) return null;
    const parsed = parseTemplateBody(body);
    if (!parsed) return null;
    templates.push({ key, body: parsed });
  }
  if (templates.length !== TEMPLATE_KEYS.length) return null;
  if (TEMPLATE_KEYS.some((key) => !templates.some((template) => template.key === key))) return null;

  let kapso: ArchiveFile["kapso"] = null;
  if (value.kapso != null) {
    if (!isRecord(value.kapso)) return null;
    const parsed = parseKapsoDraft({
      apiKey: stringField(value.kapso, "apiKey") ?? "",
      phoneNumberId: stringField(value.kapso, "phoneNumberId") ?? "",
      displayPhoneNumber: stringField(value.kapso, "displayPhoneNumber") ?? "",
    });
    if (!parsed) return null;
    kapso = parsed;
  }

  const clients: ArchiveFile["clients"] = [];
  for (const item of value.clients) {
    if (!isRecord(item)) return null;
    const id = stringField(item, "id");
    const name = stringField(item, "name")?.trim() ?? "";
    const phone = stringField(item, "phone") ?? "";
    const note = stringField(item, "note") ?? "";
    if (!id || !name || name.length > 80) return null;
    if (!Array.isArray(item.likes) || item.likes.some((like) => typeof like !== "string")) return null;
    clients.push({ id, name, phone, note, likes: item.likes });
  }

  const clientIds = new Set(clients.map((client) => client.id));
  const appointments: ArchiveFile["appointments"] = [];
  for (const item of value.appointments) {
    if (!isRecord(item)) return null;
    const id = stringField(item, "id");
    const startsAt = stringField(item, "startsAt");
    const service = stringField(item, "service") ?? "";
    const request = stringField(item, "request") ?? "";
    const status = stringField(item, "status") ?? "";
    const clientId = item.clientId == null ? null : stringField(item, "clientId");
    if (!id || !startsAt || Number.isNaN(Date.parse(startsAt))) return null;
    if (typeof item.stylistPosition !== "number" || (item.stylistPosition !== 0 && item.stylistPosition !== 1)) {
      return null;
    }
    if (typeof item.durationMinutes !== "number") return null;
    if (clientId && !clientIds.has(clientId)) return null;
    if (!Array.isArray(item.photos)) return null;
    const photos: ArchivePhoto[] = [];
    for (const photo of item.photos) {
      if (!isRecord(photo)) return null;
      const kind = photo.kind;
      const contentType = stringField(photo, "contentType");
      const bytesBase64 = stringField(photo, "bytesBase64");
      if ((kind !== "prima" && kind !== "dopo") || !contentType || !bytesBase64) return null;
      photos.push({ kind, contentType, bytesBase64 });
    }
    appointments.push({
      id,
      stylistPosition: item.stylistPosition,
      clientId,
      startsAt,
      durationMinutes: item.durationMinutes,
      service,
      request,
      status,
      photos,
    });
  }

  return { version: ARCHIVE_VERSION, closures: { weekdays, dates }, services, templates, kapso, clients, appointments };
}
