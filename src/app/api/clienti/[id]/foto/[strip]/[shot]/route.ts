import { shotIndex } from "@/lib/photo-booth";
import { readShot } from "@/lib/photo-store";
import { requireApiSalon } from "@/server/auth";
import { getPrisma } from "@/server/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; strip: string; shot: string }> },
) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const { id, strip, shot } = await context.params;
  const index = shotIndex(shot);
  if (!index) return new Response(null, { status: 404 });

  const client = await getPrisma().client.findFirst({
    where: { id, salonId: auth.salon.id },
    select: { id: true },
  });
  if (!client) return new Response(null, { status: 404 });

  const bytes = await readShot(id, strip, index);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "private, max-age=86400",
    },
  });
}
