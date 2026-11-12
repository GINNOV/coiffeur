import { KapsoForm } from "@/components/admin-forms";
import { requireSalon } from "@/server/auth";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export default async function WhatsappPage() {
  const salon = await requireSalon();
  const kapso = await getPrisma().kapsoSetting.findUnique({ where: { salonId: salon.id } });
  return (
    <KapsoForm
      initial={{
        apiKey: kapso?.apiKey ?? "",
        phoneNumberId: kapso?.phoneNumberId ?? "",
        displayPhoneNumber: kapso?.displayPhoneNumber ?? "",
      }}
    />
  );
}
