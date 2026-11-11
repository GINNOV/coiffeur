import "server-only";
import { BLOCKING_STATUSES, evaluateBooking, isDuration, type OccupyingVisit } from "@/lib/booking";
import { dateKeyInRome, dayBounds, isClosed, timeInRome, zonedTimeToUtc } from "@/lib/calendar";
import { STATUS_CODES, copy } from "@/lib/copy";
import { phoneDigits, resolveVisitClient } from "@/lib/clients";
import { messageForCode } from "@/lib/messages";
import { isOverlapError } from "@/lib/overlap-error";
import type { Clash, DayVisit } from "@/lib/types";
import { getPrisma } from "@/server/prisma";
import { toVisit } from "@/server/day";

type SaveInput = {
  id?: string | null;
  stylistId: string;
  dateKey: string;
  start: string;
  durationMinutes: number;
  status: string;
  name: string;
  phone: string;
  service: string;
  request?: string;
  clientId?: string | null;
  updatedAt?: string | null;
};

export type SaveResult =
  | { ok: true; visit: DayVisit }
  | { ok: false; status: number; error: string; clash?: Clash; visit?: DayVisit };

export async function saveAppointment(salonId: string, input: SaveInput): Promise<SaveResult> {
  if (isClosed(input.dateKey)) {
    return { ok: false, status: 409, error: copy.closed };
  }
  if (!isDuration(input.durationMinutes)) {
    return { ok: false, status: 400, error: copy.closed };
  }
  if (!(STATUS_CODES as readonly string[]).includes(input.status)) {
    return { ok: false, status: 400, error: copy.closed };
  }

  const prisma = getPrisma();
  const stylist = await prisma.stylist.findFirst({
    where: { id: input.stylistId, salonId },
  });
  if (!stylist) return { ok: false, status: 400, error: copy.closed };

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const { start, end } = dayBounds(input.dateKey);
      const rows = await tx.appointment.findMany({
        where: {
          salonId,
          stylistId: input.stylistId,
          startsAt: { gte: start, lt: end },
          status: { in: [...BLOCKING_STATUSES] },
        },
      });
      let storedUpdatedAt: string | null = null;
      if (input.id) {
        const current = await tx.appointment.findFirst({
          where: { id: input.id, salonId },
        });
        if (!current) return { kind: "stale" as const, visit: null };
        storedUpdatedAt = current.updatedAt.toISOString();
      }
      const decision = evaluateBooking(
        {
          id: input.id,
          stylistId: input.stylistId,
          dateKey: input.dateKey,
          start: input.start,
          durationMinutes: input.durationMinutes,
          status: input.status,
          name: input.name,
          service: input.service,
          updatedAt: input.updatedAt ?? null,
          storedUpdatedAt,
        },
        rows.map(toOccupying),
      );
      if (!decision.ok) {
        if (decision.code === "stale" && input.id) {
          const fresh = await tx.appointment.findFirst({
            where: { id: input.id, salonId },
            include: { client: true, photos: { select: { id: true, kind: true } } },
          });
          return { kind: "stale" as const, visit: fresh ? toVisit(fresh) : null };
        }
        return { kind: "code" as const, code: decision.code };
      }

      const cards = await tx.client.findMany({
        where: { salonId },
        select: { id: true, name: true, phoneDigits: true, phone: true },
      });
      const plan = resolveVisitClient({
        name: input.name,
        phone: input.phone,
        attachedClientId: input.name.trim() ? (input.clientId ?? null) : null,
        clients: cards,
      });
      if (plan.kind === "phone_taken") {
        const existing = cards.find((card) => card.id === plan.existingId);
        return {
          kind: "clash" as const,
          clash: {
            id: plan.existingId,
            name: existing?.name ?? "",
            phone: existing?.phone ?? "",
          },
        };
      }

      let clientId: string | null = null;
      if (plan.kind === "keep") {
        const attached = cards.find((card) => card.id === plan.clientId);
        if (!attached) {
          const retry = resolveVisitClient({
            name: input.name,
            phone: input.phone,
            attachedClientId: null,
            clients: cards,
          });
          if (retry.kind === "phone_taken") {
            const existing = cards.find((card) => card.id === retry.existingId);
            return {
              kind: "clash" as const,
              clash: {
                id: retry.existingId,
                name: existing?.name ?? "",
                phone: existing?.phone ?? "",
              },
            };
          }
          if (retry.kind === "create") {
            const created = await tx.client.create({
              data: {
                salonId,
                name: retry.name,
                phone: retry.phone,
                phoneDigits: retry.phoneDigits,
                note: "",
              },
            });
            clientId = created.id;
          }
        } else {
          clientId = attached.id;
        }
      } else if (plan.kind === "create") {
        const created = await tx.client.create({
          data: {
            salonId,
            name: plan.name,
            phone: plan.phone,
            phoneDigits: plan.phoneDigits,
            note: "",
          },
        });
        clientId = created.id;
      }

      const startsAt = zonedTimeToUtc(input.dateKey, input.start);
      const data = {
        stylistId: input.stylistId,
        clientId,
        startsAt,
        durationMinutes: decision.durationMinutes,
        service: input.service.trim(),
        request: (input.request ?? "").trim(),
        status: decision.status,
      };

      if (input.id) {
        const updated = await tx.appointment.updateMany({
          where: {
            id: input.id,
            salonId,
            updatedAt: new Date(input.updatedAt ?? ""),
          },
          data,
        });
        if (updated.count !== 1) {
          const fresh = await tx.appointment.findFirst({
            where: { id: input.id, salonId },
            include: { client: true, photos: { select: { id: true, kind: true } } },
          });
          return { kind: "stale" as const, visit: fresh ? toVisit(fresh) : null };
        }
        const row = await tx.appointment.findFirstOrThrow({
          where: { id: input.id },
          include: { client: true, photos: { select: { id: true, kind: true } } },
        });
        return { kind: "ok" as const, visit: toVisit(row) };
      }

      const row = await tx.appointment.create({
        data: { salonId, ...data },
        include: { client: true, photos: { select: { id: true, kind: true } } },
      });
      return { kind: "ok" as const, visit: toVisit(row) };
    });

    if (saved.kind === "ok") return { ok: true, visit: saved.visit };
    if (saved.kind === "clash") {
      return { ok: false, status: 409, error: copy.phoneTaken, clash: saved.clash };
    }
    if (saved.kind === "stale") {
      return {
        ok: false,
        status: 409,
        error: copy.stale,
        visit: saved.visit ?? undefined,
      };
    }
    return { ok: false, status: 409, error: messageForCode(saved.code) };
  } catch (error) {
    if (isOverlapError(error)) return { ok: false, status: 409, error: copy.occupied };
    if (isUniqueError(error)) {
      const existing = await prisma.client.findFirst({
        where: { salonId, phoneDigits: phoneDigits(input.phone) },
      });
      return {
        ok: false,
        status: 409,
        error: copy.phoneTaken,
        clash: existing
          ? { id: existing.id, name: existing.name, phone: existing.phone }
          : undefined,
      };
    }
    throw error;
  }
}

function toOccupying(row: {
  id: string;
  stylistId: string;
  startsAt: Date;
  durationMinutes: number;
  status: string;
}): OccupyingVisit {
  return {
    id: row.id,
    stylistId: row.stylistId,
    dateKey: dateKeyInRome(row.startsAt),
    start: timeInRome(row.startsAt),
    durationMinutes: row.durationMinutes,
    status: row.status,
  };
}

export function isUniqueError(error: unknown): boolean {
  if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("23505") || message.includes("Client_salon_phoneDigits");
}

