import { SettingsForm } from "@/components/settings-form";
import { requireSalon } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  const salon = await requireSalon();
  return (
    <SettingsForm
      stylists={salon.stylists.map((stylist) => ({
        id: stylist.id,
        name: stylist.name,
        position: stylist.position,
      }))}
    />
  );
}
