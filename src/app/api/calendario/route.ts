import { parseClosedDates, parseWeekdays } from "@/lib/catalog";
import { copy } from "@/lib/copy";
import { requireApiSalon } from "@/server/auth";
import { saveClosures } from "@/server/catalog";

export async function POST(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: copy.offline }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("weekdays" in body) || !("dates" in body)) {
    return Response.json({ error: copy.writeName }, { status: 400 });
  }
  if (!Array.isArray(body.weekdays) || !Array.isArray(body.dates)) {
    return Response.json({ error: copy.writeName }, { status: 400 });
  }
  if (!body.weekdays.every((day) => typeof day === "number") || !body.dates.every((day) => typeof day === "string")) {
    return Response.json({ error: copy.writeName }, { status: 400 });
  }
  const weekdays = parseWeekdays(body.weekdays);
  const dates = parseClosedDates(body.dates);
  if (!weekdays || !dates) return Response.json({ error: copy.writeName }, { status: 400 });
  await saveClosures(auth.salon.id, { weekdays, dates });
  return Response.json({ ok: true });
}
