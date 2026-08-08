import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getCompletedTasksCount, getCompletedTasksPage } from "@/lib/tasks/get-completed-tasks";
import { CompletedView } from "@/components/tasks/completed-view";
import { loginRedirectPath } from "@/lib/supabase/login-redirect-path";

const PAGE_SIZE = 50;

/** Vista Completado (bloque 8.5): lectura inicial en el servidor (D1), primera página de completadas más el contador del total. */
export default async function CompletadoPage() {
  const user = await getCurrentUser();
  if (!user) {
    // Este `redirect` no llega a ejecutarse en la práctica: el de
    // `app/(app)/layout.tsx` siempre gana (D-C de `redireccion-al-login`).
    // Queda consistente igual, para que quien lo lea no lo tome como un
    // camino real que perdió el destino.
    redirect(loginRedirectPath("/completado"));
  }

  const [initialTasks, initialCount] = await Promise.all([
    getCompletedTasksPage(user.id, PAGE_SIZE),
    getCompletedTasksCount(user.id),
  ]);

  return <CompletedView userId={user.id} initialTasks={initialTasks} initialCount={initialCount} />;
}
