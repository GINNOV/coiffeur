import { parseKapsoDraft } from "@/lib/catalog";
import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { saveKapso } from "@/server/catalog";

export async function POST(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  if (!body || typeof body !== "object") return Response.json({ error: copy.writeName }, { status: 400 });
  const apiKey = "apiKey" in body && typeof body.apiKey === "string" ? body.apiKey : "";
  const phoneNumberId = "phoneNumberId" in body && typeof body.phoneNumberId === "string" ? body.phoneNumberId : "";
  const displayPhoneNumber =
    "displayPhoneNumber" in body && typeof body.displayPhoneNumber === "string" ? body.displayPhoneNumber : "";
  const parsed = parseKapsoDraft({ apiKey, phoneNumberId, displayPhoneNumber });
  if (!parsed) return Response.json({ error: copy.writeName }, { status: 400 });
  await saveKapso(auth.salon.id, parsed);
  return Response.json({ ok: true });
}
