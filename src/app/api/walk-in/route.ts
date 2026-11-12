import { walkInStart } from "@/lib/calendar";
import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { closureRules } from "@/server/catalog";

export async function POST(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  let stylistId = "";
  try {
    const body = (await request.json()) as { stylistId?: unknown };
    stylistId = typeof body.stylistId === "string" ? body.stylistId : "";
  } catch {
    stylistId = "";
  }
  const stylist = auth.salon.stylists.find((item) => item.id === stylistId);
  if (!stylist) return Response.json({ error: copy.closed }, { status: 400 });
  const slot = walkInStart(new Date(), closureRules(auth.salon));
  if (!slot.ok) return Response.json({ error: copy.closed }, { status: 409 });
  return Response.json({ ok: true, dateKey: slot.dateKey, start: slot.start, stylistId });
}
