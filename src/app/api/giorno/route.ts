import { todayKey } from "@/lib/calendar";
import { requireApiSalon } from "@/server/auth";
import { loadDay } from "@/server/day";

export async function GET(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const dateKey = new URL(request.url).searchParams.get("d") ?? "";
  const key = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : todayKey();
  const day = await loadDay(auth.salon.id, key);
  return Response.json(day);
}
