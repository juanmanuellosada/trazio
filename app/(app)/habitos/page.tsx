import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getUserPreferences } from "@/lib/preferences/get-user-preferences";
import { getHabits } from "@/lib/habits/get-habits";
import { getHabitCompletionsHistory } from "@/lib/habits/get-habit-completions-history";
import { getHabitStreak } from "@/lib/habits/streak";
import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone } from "@/lib/dates/today";
import { HabitsView } from "@/components/habits/habits-view";
import type { HabitStreaksById } from "@/lib/habits/use-habit-streaks";

/**
 * Pantalla Hábitos (tarea 3.1): Server Component que trae los hábitos, el
 * historial de 14 días (mini-mapa y progreso semanal) y la racha de cada
 * uno, y siembra el caché de `HabitsView` — mismo patrón `initialData` que
 * `app/(app)/etiquetas/page.tsx`. `now` se calcula una sola vez acá y viaja
 * como ISO string al cliente (mismo criterio que `app/(app)/hoy/page.tsx`),
 * para que el primer render del cliente no diverja del servidor por el
 * simple paso del reloj.
 */
export default async function HabitosPage() {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const now = new Date();
  const preferences = await getUserPreferences(user.id);
  const [habits, completionsHistory] = await Promise.all([
    getHabits(user.id, preferences.timezone, now),
    getHabitCompletionsHistory(user.id, preferences.timezone, now),
  ]);

  const supabase = await createClient();
  const streaks = await Promise.all(habits.map((habit) => getHabitStreak(supabase, habit.id, now)));
  const initialStreaks: HabitStreaksById = Object.fromEntries(habits.map((habit, i) => [habit.id, streaks[i]]));

  return (
    <HabitsView
      timezone={preferences.timezone}
      nowIso={now.toISOString()}
      todayDate={todayInTimeZone(now, preferences.timezone)}
      initialHabits={habits}
      initialCompletionsHistory={completionsHistory}
      initialStreaks={initialStreaks}
    />
  );
}
