import { notFound } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import { requireSalon } from "@/server/auth";
import { loadClient } from "@/server/clients";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const salon = await requireSalon();
  const { id } = await params;
  const client = await loadClient(salon.id, id);
  if (!client) notFound();
  return <ClientForm client={client} />;
}
