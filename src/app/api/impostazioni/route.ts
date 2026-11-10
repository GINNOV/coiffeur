import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { changePin, renameColumns } from "@/server/settings";

export async function POST(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  if (body.kind === "names" && Array.isArray(body.names)) {
    const names = body.names.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as { id?: unknown; name?: unknown };
      if (typeof record.id !== "string" || typeof record.name !== "string") return [];
      return [{ id: record.id, name: record.name }];
    });
    const result = await renameColumns(auth.salon.id, names);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.kind === "pin") {
    const result = await changePin(auth.salon.id, {
      currentPin: typeof body.currentPin === "string" ? body.currentPin : "",
      nextPin: typeof body.nextPin === "string" ? body.nextPin : "",
      confirmPin: typeof body.confirmPin === "string" ? body.confirmPin : "",
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true });
  }
  return Response.json({ error: copy.writeName }, { status: 400 });
}
