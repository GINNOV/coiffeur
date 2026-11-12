import { CalendarForm } from "@/components/admin-forms";
import { requireSalon } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const salon = await requireSalon();
  return <CalendarForm weekdays={salon.closedWeekdays} dates={salon.closedDates} />;
}
