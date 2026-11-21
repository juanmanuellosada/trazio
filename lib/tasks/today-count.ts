import { createClient } from "@/lib/supabase/server";
import { getHabits } from "@/lib/habits/get-habits";
import type { Habit } from "@/lib/habits/habit-columns";
import { dueTodayOrOverdueFilter } from "@/lib/tasks/hoy-filter";

export type TodayCountSeedData = {
  taskCount: number;
  habits: Habit[];
};

/**
 * Datos de siembra del contador de la vista Hoy para el panel lateral (F1
 * del design de fase 1 y el requirement "Contador de pendientes de Hoy
 * solo cuenta tareas" del spec de `vistas-lista`, ampliado en fase 3 para
 * sumar hábitos, y en el cambio `pendientes-en-el-icono-y-el-titulo` para
 * compartir criterio con el badge): tareas propias, pendientes, atrasadas
 * o que vencen hoy, más los hábitos pendientes de hoy
 * (`lib/habits/pending-today.ts`, D-H de `design.md`).
 *
 * Devuelve las dos piezas por separado en vez del total: el layout ya no
 * pinta el número (el panel lateral quedaba congelado en un `Server
 * Component` que no se vuelve a renderizar en navegación de cliente, bug
 * `hoy-congelado-en-el-sidebar`) — las usa `TodayCountSeed` para sembrar el
 * caché de TanStack Query de `usePendingTodayCount`
 * (`lib/pending-count/pending-today-count.ts`), que sigue siendo el único
 * lugar donde se suman. Cada pieza sale de la misma consulta que su
 * contraparte cliente: `taskCount` usa `dueTodayOrOverdueFilter`
 * (`lib/tasks/hoy-filter.ts`), igual que
 * `lib/pending-count/pending-today-count.ts`; `habits` sale de `getHabits`,
 * la misma forma que `fetchHabits` (`lib/habits/use-habits.ts`) — si
 * alguna de las dos divergiera de su contraparte, panel lateral e
 * ícono/título volverían a decir números distintos.
 */
export async function getTodayCountSeed(userId: string, timezone: string): Promise<TodayCountSeedData> {
  const supabase = await createClient();
  const now = new Date();

  const [{ count }, habits] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("completed_at", null)
      .or(dueTodayOrOverdueFilter(now, timezone)),
    getHabits(userId, timezone, now),
  ]);

  return { taskCount: count ?? 0, habits };
}
