import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { loginRedirectPath } from "@/lib/supabase/login-redirect-path";
import { getUserPreferences } from "@/lib/preferences/get-user-preferences";
import { getInboxProjectId } from "@/lib/projects/get-inbox-project";
import { getHoyTasks } from "@/lib/tasks/get-hoy-tasks";
import { getHabits } from "@/lib/habits/get-habits";
import { todayInTimeZone } from "@/lib/dates/today";
import { getViewPreferences } from "@/lib/view-options/get-view-preferences";
import { HoyView } from "@/components/tasks/hoy-view";

/**
 * Vista Hoy (bloque 8.2): atrasadas destacadas, tareas de hoy y, si el
 * usuario lo pide, completadas de hoy. `now` se calcula una sola vez acá y
 * viaja como ISO string al cliente: el bucketing de bloques tiene que usar
 * el mismo instante en el primer render del cliente que ya usó el servidor,
 * para no divergir en la hidratación por el simple paso del reloj.
 *
 * `getHabits` (fase 3, tarea 4.1) siembra el mismo caché `["habits"]` que
 * usa `/habitos` — es la misma consulta, sin una versión propia para Hoy.
 */
export default async function HoyPage() {
  const user = await getCurrentUser();
  if (!user) {
    // Este `redirect` no llega a ejecutarse en la práctica: el de
    // `app/(app)/layout.tsx` siempre gana (D-C de `redireccion-al-login`).
    // Queda consistente igual, para que quien lo lea no lo tome como un
    // camino real que perdió el destino.
    redirect(loginRedirectPath("/hoy"));
  }

  const now = new Date();
  const [preferences, inboxProjectId, initialOptions] = await Promise.all([
    getUserPreferences(user.id),
    getInboxProjectId(user.id),
    getViewPreferences(user.id, "hoy"),
  ]);
  const [initialTasks, initialHabits] = await Promise.all([
    getHoyTasks(user.id, preferences.timezone, now),
    getHabits(user.id, preferences.timezone, now),
  ]);

  return (
    <HoyView
      userId={user.id}
      timezone={preferences.timezone}
      inboxProjectId={inboxProjectId}
      initialTasks={initialTasks}
      initialHabits={initialHabits}
      nowIso={now.toISOString()}
      todayDate={todayInTimeZone(now, preferences.timezone)}
      initialOptions={initialOptions}
    />
  );
}
