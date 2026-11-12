import "server-only";
import { ARCHIVE_VERSION, parseArchive, type ArchiveFile } from "@/lib/archive";
import { phoneDigits } from "@/lib/clients";
import { ensureTemplates } from "@/server/catalog";
import { getPrisma } from "@/server/prisma";

export async function buildArchive(salonId: string): Promise<ArchiveFile> {
  const prisma = getPrisma();
  const salon = await prisma.salon.findFirstOrThrow({
    where: { id: salonId },
    include: {
      services: { orderBy: { position: "asc" } },
      kapso: true,
      clients: { orderBy: { name: "asc" } },
      appointments: { include: { photos: true, stylist: true }, orderBy: { startsAt: "asc" } },
    },
  });
  const templates = await ensureTemplates(salonId);
  return {
    version: ARCHIVE_VERSION,
    closures: { weekdays: salon.closedWeekdays, dates: salon.closedDates },
    services: salon.services.map((service) => ({
      name: service.name,
      durationMinutes: service.durationMinutes,
      position: service.position,
    })),
    templates: templates.flatMap((template) => {
      if (template.key !== "conferma" && template.key !== "promemoria" && template.key !== "compleanno") {
        return [];
      }
      return [{ key: template.key, body: template.body }];
    }),
    kapso: salon.kapso
      ? {
          apiKey: salon.kapso.apiKey,
          phoneNumberId: salon.kapso.phoneNumberId,
          displayPhoneNumber: salon.kapso.displayPhoneNumber,
        }
      : null,
    clients: salon.clients.map((client) => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
      note: client.note,
      likes: client.likes,
    })),
    appointments: salon.appointments.map((appointment) => ({
      id: appointment.id,
      stylistPosition: appointment.stylist.position,
      clientId: appointment.clientId,
      startsAt: appointment.startsAt.toISOString(),
      durationMinutes: appointment.durationMinutes,
      service: appointment.service,
      request: appointment.request,
      status: appointment.status,
      photos: appointment.photos.map((photo) => ({
        kind: photo.kind === "dopo" ? "dopo" : "prima",
        contentType: photo.contentType,
        bytesBase64: Buffer.from(photo.bytes).toString("base64"),
      })),
    })),
  };
}

export async function replaceFromArchive(salonId: string, file: ArchiveFile): Promise<void> {
  const prisma = getPrisma();
  const stylists = await prisma.stylist.findMany({ where: { salonId } });
  const stylistByPosition = new Map(stylists.map((stylist) => [stylist.position, stylist.id]));
  if (!stylistByPosition.has(0) || !stylistByPosition.has(1)) {
    throw new Error("missing stylists");
  }
  await prisma.$transaction(async (tx) => {
    await tx.appointment.deleteMany({ where: { salonId } });
    await tx.client.deleteMany({ where: { salonId } });
    await tx.service.deleteMany({ where: { salonId } });
    await tx.messageTemplate.deleteMany({ where: { salonId } });
    await tx.kapsoSetting.deleteMany({ where: { salonId } });
    await tx.salon.update({
      where: { id: salonId },
      data: { closedWeekdays: file.closures.weekdays, closedDates: file.closures.dates },
    });
    if (file.services.length > 0) {
      await tx.service.createMany({
        data: file.services.map((service) => ({ salonId, ...service })),
      });
    }
    await tx.messageTemplate.createMany({
      data: file.templates.map((template) => ({ salonId, key: template.key, body: template.body })),
    });
    if (file.kapso) {
      await tx.kapsoSetting.create({ data: { salonId, ...file.kapso } });
    }
    if (file.clients.length > 0) {
      await tx.client.createMany({
        data: file.clients.map((client) => ({
          id: client.id,
          salonId,
          name: client.name,
          phone: client.phone,
          phoneDigits: phoneDigits(client.phone),
          note: client.note,
          likes: client.likes,
        })),
      });
    }
    for (const appointment of file.appointments) {
      const stylistId = stylistByPosition.get(appointment.stylistPosition);
      if (!stylistId) throw new Error("missing stylist");
      await tx.appointment.create({
        data: {
          id: appointment.id,
          salonId,
          stylistId,
          clientId: appointment.clientId,
          startsAt: new Date(appointment.startsAt),
          durationMinutes: appointment.durationMinutes,
          service: appointment.service,
          request: appointment.request,
          status: appointment.status,
          photos: {
            create: appointment.photos.map((photo) => ({
              kind: photo.kind,
              contentType: photo.contentType,
              bytes: Buffer.from(photo.bytesBase64, "base64"),
            })),
          },
        },
      });
    }
  });
}

export function readArchive(value: unknown): ArchiveFile | null {
  return parseArchive(value);
}
