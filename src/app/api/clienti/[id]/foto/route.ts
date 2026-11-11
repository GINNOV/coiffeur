import { copy } from "@/lib/copy";
import { SHOT_COUNT } from "@/lib/photo-booth";
import { isJpeg, saveStrip } from "@/lib/photo-store";
import { requireApiSalon } from "@/server/auth";
import { getPrisma } from "@/server/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const client = await getPrisma().client.findFirst({
    where: { id, salonId: auth.salon.id },
    select: { id: true },
  });
  if (!client) return Response.json({ error: copy.photoFailed }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: copy.needFour }, { status: 400 });
  }

  const files = form.getAll("shot");
  if (files.length !== SHOT_COUNT) return Response.json({ error: copy.needFour }, { status: 400 });

  const shots: Buffer[] = [];
  for (const file of files) {
    if (!(file instanceof File)) return Response.json({ error: copy.needFour }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!isJpeg(bytes)) return Response.json({ error: copy.needFour }, { status: 400 });
    shots.push(bytes);
  }

  const stripId = await saveStrip(id, shots);
  if (!stripId) return Response.json({ error: copy.photoFailed }, { status: 400 });
  return Response.json({
    id: stripId,
    shots: [1, 2, 3, 4].map((shot) => `/api/clienti/${id}/foto/${stripId}/${shot}`),
  });
}
