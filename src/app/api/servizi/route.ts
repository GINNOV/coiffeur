import { parseServiceDraft } from "@/lib/catalog";
import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { saveServices } from "@/server/catalog";

export async function POST(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("services" in body) || !Array.isArray(body.services)) {
    return Response.json({ error: copy.writeName }, { status: 400 });
  }
  const services = [];
  for (const item of body.services) {
    if (!item || typeof item !== "object" || !("name" in item) || !("durationMinutes" in item)) {
      return Response.json({ error: copy.writeName }, { status: 400 });
    }
    const name = typeof item.name === "string" ? item.name : "";
    const durationMinutes = typeof item.durationMinutes === "number" ? item.durationMinutes : 0;
    const parsed = parseServiceDraft({ name, durationMinutes });
    if (!parsed) return Response.json({ error: copy.writeName }, { status: 400 });
    services.push(parsed);
  }
  await saveServices(auth.salon.id, services);
  return Response.json({ ok: true });
}
