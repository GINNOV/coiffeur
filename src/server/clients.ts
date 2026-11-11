import "server-only";
import { dateKeyInRome, formatVisitWhen } from "@/lib/calendar";
import { normalizeLikes } from "@/lib/client-file";
import { copy, statusLabel } from "@/lib/copy";
import { phoneDigits, updateClientPhone } from "@/lib/clients";
import { messageForCode } from "@/lib/messages";
import type { ClientDetail, ClientHit } from "@/lib/types";
import { photoSlots } from "@/server/day";
import { getPrisma } from "@/server/prisma";
import { isUniqueError } from "@/server/appointments";

export async function searchDirectory(salonId: string, query: string): Promise<ClientHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const digits = phoneDigits(trimmed);
  const rawDigits = trimmed.replace(/\D/g, "");
  const rows = await getPrisma().client.findMany({
    where: {
      salonId,
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        ...(digits ? [{ phoneDigits: { contains: digits } }] : []),
        ...(rawDigits && rawDigits !== digits ? [{ phoneDigits: { contains: rawDigits } }] : []),
      ],
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 8,
    include: {
      appointments: {
        orderBy: { startsAt: "desc" },
        take: 1,
        select: { startsAt: true },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    lastVisitDate: row.appointments[0] ? formatVisitWhen(row.appointments[0].startsAt) : null,
  }));
}

export async function loadClient(salonId: string, id: string): Promise<ClientDetail | null> {
  const row = await getPrisma().client.findFirst({
    where: { id, salonId },
    include: {
      appointments: {
        orderBy: { startsAt: "desc" },
        include: { stylist: true, photos: { select: { id: true, kind: true } } },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    note: row.note,
    likes: row.likes,
    visits: row.appointments.map((visit) => ({
      id: visit.id,
      when: formatVisitWhen(visit.startsAt),
      dateKey: dateKeyInRome(visit.startsAt),
      stylistName: visit.stylist.name,
      service: visit.service,
      request: visit.request,
      status: statusLabel(visit.status),
      photos: photoSlots(visit.photos),
    })),
  };
}

export async function saveClientCard(
  salonId: string,
  id: string,
  input: { name: string; phone: string; note: string; likes: string[] },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: copy.writeName };
  const likes = normalizeLikes(input.likes);
  if (!likes.ok) return { ok: false, error: messageForCode(likes.code) };
  const prisma = getPrisma();
  const cards = await prisma.client.findMany({
    where: { salonId },
    select: { id: true, phoneDigits: true },
  });
  if (!cards.some((card) => card.id === id)) return { ok: false, error: copy.writeName };
  const phone = updateClientPhone(cards, id, input.phone);
  if (!phone.ok) return { ok: false, error: copy.phoneTaken };
  try {
    await prisma.client.update({
      where: { id },
      data: {
        name,
        phone: phone.phone,
        phoneDigits: phone.phoneDigits,
        note: input.note,
        likes: likes.likes,
      },
    });
  } catch (error) {
    if (isUniqueError(error)) return { ok: false, error: copy.phoneTaken };
    throw error;
  }
  return { ok: true };
}
