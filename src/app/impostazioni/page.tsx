import { AdminHub } from "@/components/admin-hub";
import { kapsoIsConnected } from "@/lib/catalog";
import { buildAdminCards } from "@/lib/admin-hub";
import { requireSalon } from "@/server/auth";
import { ensureTemplates } from "@/server/catalog";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  const salon = await requireSalon();
  const prisma = getPrisma();
  const [services, templates, kapso] = await Promise.all([
    prisma.service.count({ where: { salonId: salon.id } }),
    ensureTemplates(salon.id),
    prisma.kapsoSetting.findUnique({ where: { salonId: salon.id } }),
  ]);
  const cards = buildAdminCards({
    services,
    closures: salon.closedWeekdays.length + salon.closedDates.length,
    templates: templates.length,
    kapsoConnected: kapsoIsConnected(kapso),
    stylists: salon.stylists.length,
  });
  return <AdminHub cards={cards} />;
}
