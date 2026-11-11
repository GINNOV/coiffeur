import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { saveVisitRequest } from "@/server/visit-file";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  let body: { request?: unknown };
  try {
    body = (await request.json()) as { request?: unknown };
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  const result = await saveVisitRequest(auth.salon.id, id, typeof body.request === "string" ? body.request : "");
  if (!result.ok) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
