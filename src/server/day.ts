import "server-only";
import { addDays, dayBounds, dayHeading, isClosed, timeInRome } from "@/lib/calendar";
import type { DayPayload, DayVisit, VisitPhotos } from "@/lib/types";
import { closureRules } from "@/server/catalog";
import { getPrisma } from "@/server/prisma";

export async function loadDay(salonId: string, dateKey: string): Promise<DayPayload> {
  const prisma = getPrisma();
  const salon = await prisma.salon.findFirst({ where: { id: salonId } });
  const rules = salon ? closureRules(salon) : undefined;
  const stylists = await prisma.stylist.findMany({
    where: { salonId },
    orderBy: { position: "asc" },
  });
  const { start, end } = dayBounds(dateKey);
  const rows = await prisma.appointment.findMany({
    where: { salonId, startsAt: { gte: start, lt: end } },
    include: { client: true, photos: { select: { id: true, kind: true } } },
    orderBy: { startsAt: "asc" },
  });
  const visitsByStylist = new Map<string, DayVisit[]>();
  for (const row of rows) {
    const list = visitsByStylist.get(row.stylistId) ?? [];
    list.push(toVisit(row));
    visitsByStylist.set(row.stylistId, list);
  }
  return {
    dateKey,
    heading: dayHeading(dateKey),
    closed: isClosed(dateKey, rules),
    prev: addDays(dateKey, -1),
    next: addDays(dateKey, 1),
    stylists: stylists.map((stylist) => ({
      id: stylist.id,
      name: stylist.name,
      position: stylist.position,
      visits: visitsByStylist.get(stylist.id) ?? [],
    })),
  };
}

export function photoSlots(photos: { id: string; kind: string }[] | undefined): VisitPhotos {
  return {
    prima: photos?.find((photo) => photo.kind === "prima")?.id ?? null,
    dopo: photos?.find((photo) => photo.kind === "dopo")?.id ?? null,
  };
}

export function toVisit(row: {
  id: string;
  stylistId: string;
  clientId: string | null;
  startsAt: Date;
  durationMinutes: number;
  service: string;
  request?: string;
  status: string;
  updatedAt: Date;
  client: { name: string; phone: string } | null;
  photos?: { id: string; kind: string }[];
}): DayVisit {
  return {
    id: row.id,
    stylistId: row.stylistId,
    clientId: row.clientId,
    clientName: row.client?.name ?? "",
    phone: row.client?.phone ?? "",
    service: row.service,
    request: row.request ?? "",
    status: row.status,
    start: timeInRome(row.startsAt),
    durationMinutes: row.durationMinutes,
    updatedAt: row.updatedAt.toISOString(),
    photos: photoSlots(row.photos),
  };
}
