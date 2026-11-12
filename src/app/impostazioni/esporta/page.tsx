import { DownloadPanel } from "@/components/admin-forms";
import { requireSalon } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function EsportaPage() {
  await requireSalon();
  return (
    <DownloadPanel
      title="Esporta dati"
      description="Lo stesso file del backup, da spostare o da conservare fuori dal salone."
    />
  );
}
