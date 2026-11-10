import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { saveClientCard } from "@/server/clients";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  let body: { name?: unknown; phone?: unknown; note?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; phone?: unknown; note?: unknown };
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  const result = await saveClientCard(auth.salon.id, id, {
    name: typeof body.name === "string" ? body.name : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    note: typeof body.note === "string" ? body.note : "",
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 409 });
  return Response.json({ ok: true });
}
