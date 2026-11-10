import { canOpenSession } from "@/lib/session";
import { copy } from "@/lib/copy";
import { sessionSecret, setSessionCookie } from "@/server/auth";
import { getPrisma } from "@/server/prisma";

export async function POST(request: Request) {
  let pin = "";
  try {
    const body = (await request.json()) as { pin?: unknown };
    pin = typeof body.pin === "string" ? body.pin : "";
  } catch {
    pin = "";
  }
  if (!sessionSecret()) {
    return Response.json({ error: copy.pinInvalid }, { status: 500 });
  }
  const salon = await getPrisma().salon.findFirst();
  if (!salon || !canOpenSession(pin, salon.pinHash)) {
    return Response.json({ error: copy.pinInvalid }, { status: 401 });
  }
  await setSessionCookie(salon.pinVersion);
  return Response.json({ ok: true });
}
