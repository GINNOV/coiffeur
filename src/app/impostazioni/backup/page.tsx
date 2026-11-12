import { DownloadPanel } from "@/components/admin-forms";
import { requireSalon } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  await requireSalon();
  return (
    <DownloadPanel
      title="Backup"
      description="Una copia completa: clienti, visite, foto, servizi, modelli, chiusure e Kapso."
    />
  );
}
