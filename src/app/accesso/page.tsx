import { redirect } from "next/navigation";
import { AccessForm } from "@/components/access-form";
import { sessionStillValid } from "@/lib/session";
import { readSessionFromCookies } from "@/server/auth";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export default async function AccessoPage() {
  const payload = await readSessionFromCookies();
  if (payload) {
    const salon = await getPrisma().salon.findFirst();
    if (salon && sessionStillValid(payload, salon.pinVersion)) redirect("/giorno");
  }
  return <AccessForm />;
}
