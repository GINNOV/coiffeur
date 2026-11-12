import { ServicesForm } from "@/components/admin-forms";
import { requireSalon } from "@/server/auth";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export default async function ServiziPage() {
  const salon = await requireSalon();
  const services = await getPrisma().service.findMany({
    where: { salonId: salon.id },
    orderBy: { position: "asc" },
  });
  return (
    <ServicesForm
      initial={services.map((service) => ({ name: service.name, durationMinutes: service.durationMinutes }))}
    />
  );
}
