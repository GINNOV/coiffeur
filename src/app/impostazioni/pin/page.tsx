import { PinForm } from "@/components/settings-form";
import { requireSalon } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function PinPage() {
  await requireSalon();
  return <PinForm />;
}
