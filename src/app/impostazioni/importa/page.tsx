import { ImportForm } from "@/components/admin-forms";
import { requireSalon } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function ImportaPage() {
  await requireSalon();
  return <ImportForm />;
}
