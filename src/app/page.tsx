import { redirect } from "next/navigation";
import { sessionStillValid } from "@/lib/session";
import { readSessionFromCookies } from "@/server/auth";
import { getPrisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const payload = await readSessionFromCookies();
  if (!payload) redirect("/accesso");
  const salon = await getPrisma().salon.findFirst();
  if (!salon || !sessionStillValid(payload, salon.pinVersion)) redirect("/accesso");
  redirect("/giorno");
}
