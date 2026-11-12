import { isTemplateKey, parseTemplateBody, TEMPLATE_KEYS, type TemplateKey } from "@/lib/catalog";
import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { saveTemplates } from "@/server/catalog";

export async function POST(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("templates" in body) || !Array.isArray(body.templates)) {
    return Response.json({ error: copy.writeName }, { status: 400 });
  }
  const templates: { key: TemplateKey; body: string }[] = [];
  for (const item of body.templates) {
    if (!item || typeof item !== "object" || !("key" in item) || !("body" in item)) {
      return Response.json({ error: copy.writeName }, { status: 400 });
    }
    const key = typeof item.key === "string" ? item.key : "";
    const text = typeof item.body === "string" ? item.body : "";
    if (!isTemplateKey(key)) return Response.json({ error: copy.writeName }, { status: 400 });
    const parsed = parseTemplateBody(text);
    if (!parsed) return Response.json({ error: copy.writeName }, { status: 400 });
    templates.push({ key, body: parsed });
  }
  if (templates.length !== TEMPLATE_KEYS.length) return Response.json({ error: copy.writeName }, { status: 400 });
  if (TEMPLATE_KEYS.some((key) => !templates.some((template) => template.key === key))) {
    return Response.json({ error: copy.writeName }, { status: 400 });
  }
  await saveTemplates(auth.salon.id, templates);
  return Response.json({ ok: true });
}
