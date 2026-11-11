import { requireApiSalon } from "@/server/auth";
import { readVisitPhoto } from "@/server/visit-file";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const photo = await readVisitPhoto(auth.salon.id, id);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "content-type": photo.contentType,
      "cache-control": "private, max-age=3600",
    },
  });
}
