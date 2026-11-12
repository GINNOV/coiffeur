import { copy } from "@/lib/copy";
import { todayKey } from "@/lib/calendar";
import { requireApiSalon } from "@/server/auth";
import { buildArchive, readArchive, replaceFromArchive } from "@/server/archive";

export async function GET() {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const file = await buildArchive(auth.salon.id);
  return new Response(JSON.stringify(file, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="salone-${todayKey()}.json"`,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("confirm" in body) || body.confirm !== "IMPORTA" || !("archive" in body)) {
    return Response.json({ error: copy.writeName }, { status: 400 });
  }
  const archive = readArchive(body.archive);
  if (!archive) return Response.json({ error: copy.writeName }, { status: 400 });
  try {
    await replaceFromArchive(auth.salon.id, archive);
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  return Response.json({ ok: true });
}
