import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { loginRedirectPath } from "@/lib/supabase/login-redirect-path";
import { getUserPreferences } from "@/lib/preferences/get-user-preferences";
import { getInboxProjectId } from "@/lib/projects/get-inbox-project";
import { getUpcomingTasks } from "@/lib/tasks/get-upcoming-tasks";
import { getViewPreferences } from "@/lib/view-options/get-view-preferences";
import { ProximosView } from "@/components/tasks/proximos-view";

/**
 * Vista Próximos (bloque 3.7, capacidad `vista-proximos`, extendida por el
 * bloque 6): mismo patrón que `app/(app)/hoy/page.tsx` — `now` se calcula
 * una sola vez acá y viaja como ISO string al cliente para que el bucketing
 * por día no diverja en la hidratación. La ventana (`daysAhead`) y
 * "mostrar completadas" salen de las opciones de vista persistidas
 * (`view_key: "proximos"`), en vez del default fijo que usaba antes de
 * este bloque.
 */
export default async function ProximosPage() {
  const user = await getCurrentUser();
  if (!user) {
    // Este `redirect` no llega a ejecutarse en la práctica: el de
    // `app/(app)/layout.tsx` siempre gana (D-C de `redireccion-al-login`).
    // Queda consistente igual, para que quien lo lea no lo tome como un
    // camino real que perdió el destino.
    redirect(loginRedirectPath("/proximos"));
  }

  const now = new Date();
  const [preferences, inboxProjectId, initialOptions] = await Promise.all([
    getUserPreferences(user.id),
    getInboxProjectId(user.id),
    getViewPreferences(user.id, "proximos"),
  ]);
  const initialTasks = await getUpcomingTasks(
    user.id,
    preferences.timezone,
    now,
    initialOptions.daysAhead,
    initialOptions.showCompleted,
  );

  return (
    <ProximosView
      userId={user.id}
      timezone={preferences.timezone}
      inboxProjectId={inboxProjectId}
      initialTasks={initialTasks}
      nowIso={now.toISOString()}
      initialOptions={initialOptions}
    />
  );
}
