import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { loadClient, saveClientCard } from "@/server/clients";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const client = await loadClient(auth.salon.id, id);
  if (!client) return Response.json({ error: copy.writeName }, { status: 404 });
  return Response.json({ likes: client.likes });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  let body: { name?: unknown; phone?: unknown; note?: unknown; likes?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; phone?: unknown; note?: unknown; likes?: unknown };
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  const result = await saveClientCard(auth.salon.id, id, {
    name: typeof body.name === "string" ? body.name : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    note: typeof body.note === "string" ? body.note : "",
    likes: Array.isArray(body.likes) ? body.likes.filter((line) => typeof line === "string") : [],
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 409 });
  return Response.json({ ok: true });
}
