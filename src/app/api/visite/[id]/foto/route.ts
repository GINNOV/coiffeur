import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { removeVisitPhoto, saveVisitPhoto } from "@/server/visit-file";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: copy.photoType }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await saveVisitPhoto(auth.salon.id, id, kind, file.type, bytes);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, photos: result.photos });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const kind = new URL(request.url).searchParams.get("kind") ?? "";
  const result = await removeVisitPhoto(auth.salon.id, id, kind);
  if (!result.ok) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true, photos: result.photos });
}
