import { DEFAULT_DURATION, DEFAULT_STATUS } from "@/lib/booking";
import { copy } from "@/lib/copy";
import { saveAppointment } from "@/server/appointments";
import { requireApiSalon } from "@/server/auth";

export async function POST(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  const result = await saveAppointment(auth.salon.id, {
    id: typeof body.id === "string" ? body.id : null,
    stylistId: typeof body.stylistId === "string" ? body.stylistId : "",
    dateKey: typeof body.dateKey === "string" ? body.dateKey : "",
    start: typeof body.start === "string" ? body.start : "",
    durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : DEFAULT_DURATION,
    status: typeof body.status === "string" ? body.status : DEFAULT_STATUS,
    name: typeof body.name === "string" ? body.name : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    service: typeof body.service === "string" ? body.service : "",
    clientId: typeof body.clientId === "string" ? body.clientId : null,
    updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : null,
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error, clash: result.clash ?? null, visit: result.visit ?? null },
      { status: result.status },
    );
  }
  return Response.json({ ok: true, visit: result.visit });
}
