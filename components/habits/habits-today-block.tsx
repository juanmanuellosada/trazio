"use client";

import { useMemo } from "react";
import type { Habit } from "@/lib/habits/habit-columns";
import { useHabits } from "@/lib/habits/use-habits";
import { habitsDueTodayWithEffectiveTime } from "@/lib/habits/today";
import { useHabitScheduleOverridesForDate } from "@/lib/habits/schedule-overrides";
import { HabitTodayRow } from "./habit-today-row";

/**
 * Bloque de hábitos del día en Hoy (tareas 4.1/4.2 de fase 3, spec
 * `vistas-lista` "Vista Hoy"): entre las tareas de hoy y las completadas,
 * con su propio contador de cuántos se marcaron ("N de M", mismo formato
 * que el encabezado de `/habitos`). Reusa `useHabits` (mismo
 * `["habits"]` de la pantalla Hábitos, así que una marca ahí se refleja acá
 * sin un caso especial de invalidación) y `habitsDueTodayWithEffectiveTime`
 * del bloque 2 — nada de esta lógica se reimplementa. Los overrides de hoy
 * se traen en una sola consulta para todos los hábitos
 * (`useHabitScheduleOverridesForDate`), no una por hábito: acá no hay un
 * popover por fila que justifique la consulta puntual de
 * `useHabitScheduleOverride` que sí usa `HabitCard`.
 *
 * Dentro del bloque, orden por hora (D25): los hábitos con horario antes,
 * en orden cronológico según la hora efectiva (la del override de hoy si
 * existe, si no la habitual), y los de todo el día al final.
 *
 * `null` si no hay ningún hábito programado para hoy, o si el llamador
 * decide no renderizarlo (`options.showHabits` en `HoyView`, tarea 4.5).
 */
export function HabitsTodayBlock({
  timezone,
  now,
  todayDate,
  initialHabits,
}: {
  timezone: string;
  now: Date;
  todayDate: string;
  initialHabits: Habit[];
}) {
  const { data } = useHabits(timezone, initialHabits);
  const { data: overridesByHabitId } = useHabitScheduleOverridesForDate(todayDate);

  // Orden por hora (D25): con horario primero, en orden cronológico; sin
  // horario ("todo el día") al final.
  const dueToday = useMemo(() => {
    const due = habitsDueTodayWithEffectiveTime(data ?? [], overridesByHabitId ?? {}, timezone, now);
    return [...due].sort((a, b) => {
      if (a.effective_scheduled_time === b.effective_scheduled_time) return 0;
      if (a.effective_scheduled_time === null) return 1;
      if (b.effective_scheduled_time === null) return -1;
      return a.effective_scheduled_time.localeCompare(b.effective_scheduled_time);
    });
  }, [data, overridesByHabitId, timezone, now]);

  if (dueToday.length === 0) return null;

  const doneCount = dueToday.filter((h) => h.completed_today).length;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">
        Hábitos de hoy ({doneCount} de {dueToday.length})
      </h2>
      <ul className="flex flex-col">
        {dueToday.map((habit) => (
          <HabitTodayRow
            key={habit.id}
            habit={habit}
            effectiveTime={habit.effective_scheduled_time}
            todayDate={todayDate}
            timezone={timezone}
          />
        ))}
      </ul>
    </section>
  );
}
