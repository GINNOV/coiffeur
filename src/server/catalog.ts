import "server-only";
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS, type TemplateKey } from "@/lib/catalog";
import type { ClosureRules } from "@/lib/calendar";
import { getPrisma } from "@/server/prisma";

export function closureRules(salon: { closedWeekdays: number[]; closedDates: string[] }): ClosureRules {
  return { weekdays: salon.closedWeekdays, dates: salon.closedDates };
}

export async function ensureTemplates(salonId: string) {
  const prisma = getPrisma();
  const existing = await prisma.messageTemplate.findMany({ where: { salonId } });
  const have = new Set(existing.map((template) => template.key));
  const missing = TEMPLATE_KEYS.filter((key) => !have.has(key));
  if (missing.length > 0) {
    await prisma.messageTemplate.createMany({
      data: missing.map((key) => ({ salonId, key, body: DEFAULT_TEMPLATES[key] })),
    });
  }
  return prisma.messageTemplate.findMany({ where: { salonId }, orderBy: { key: "asc" } });
}

export async function saveServices(
  salonId: string,
  services: { name: string; durationMinutes: number }[],
) {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.service.deleteMany({ where: { salonId } });
    if (services.length === 0) return;
    await tx.service.createMany({
      data: services.map((service, position) => ({
        salonId,
        name: service.name,
        durationMinutes: service.durationMinutes,
        position,
      })),
    });
  });
}

export async function saveClosures(salonId: string, rules: ClosureRules) {
  await getPrisma().salon.update({
    where: { id: salonId },
    data: { closedWeekdays: [...rules.weekdays], closedDates: [...rules.dates] },
  });
}

export async function saveTemplates(salonId: string, templates: { key: TemplateKey; body: string }[]) {
  const prisma = getPrisma();
  await prisma.$transaction(
    templates.map((template) =>
      prisma.messageTemplate.upsert({
        where: { salonId_key: { salonId, key: template.key } },
        create: { salonId, key: template.key, body: template.body },
        update: { body: template.body },
      }),
    ),
  );
}

export async function saveKapso(
  salonId: string,
  setting: { apiKey: string; phoneNumberId: string; displayPhoneNumber: string },
) {
  await getPrisma().kapsoSetting.upsert({
    where: { salonId },
    create: { salonId, ...setting },
    update: setting,
  });
}
