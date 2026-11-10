import { DayBoard } from "@/components/day-board";
import { todayKey } from "@/lib/calendar";
import { requireSalon } from "@/server/auth";
import { loadDay } from "@/server/day";

export const dynamic = "force-dynamic";

export default async function GiornoPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; start?: string; stylist?: string }>;
}) {
  const salon = await requireSalon();
  const params = await searchParams;
  const dateKey = params.d && /^\d{4}-\d{2}-\d{2}$/.test(params.d) ? params.d : todayKey();
  const day = await loadDay(salon.id, dateKey);
  const seed =
    params.start && params.stylist ? { start: params.start, stylistId: params.stylist } : null;
  return <DayBoard key={dateKey} initialDay={day} seed={seed} />;
}
