import { ColumnNamesForm } from "@/components/settings-form";
import { requireSalon } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function PoltronePage() {
  const salon = await requireSalon();
  return (
    <ColumnNamesForm
      stylists={salon.stylists.map((stylist) => ({
        id: stylist.id,
        name: stylist.name,
        position: stylist.position,
      }))}
    />
  );
}
