import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getUserPreferences } from "@/lib/preferences/get-user-preferences";
import { getInboxProjectId } from "@/lib/projects/get-inbox-project";
import { getHoyTasks } from "@/lib/tasks/get-hoy-tasks";
import { todayInTimeZone } from "@/lib/dates/today";
import { HoyView } from "@/components/tasks/hoy-view";

/**
 * Vista Hoy (bloque 8.2): atrasadas destacadas, tareas de hoy y, si el
 * usuario lo pide, completadas de hoy. `now` se calcula una sola vez acá y
 * viaja como ISO string al cliente: el bucketing de bloques tiene que usar
 * el mismo instante en el primer render del cliente que ya usó el servidor,
 * para no divergir en la hidratación por el simple paso del reloj.
 */
export default async function HoyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const [preferences, inboxProjectId] = await Promise.all([
    getUserPreferences(user.id),
    getInboxProjectId(user.id),
  ]);
  const initialTasks = await getHoyTasks(user.id, preferences.timezone, now);

  return (
    <HoyView
      userId={user.id}
      timezone={preferences.timezone}
      inboxProjectId={inboxProjectId}
      initialTasks={initialTasks}
      nowIso={now.toISOString()}
      todayDate={todayInTimeZone(now, preferences.timezone)}
    />
  );
}
