"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { formatHabitTime } from "@/lib/habits/format";
import { useMarkHabitDone, useUnmarkHabitDone } from "@/lib/habits/mutations";
import type { Habit } from "@/lib/habits/habit-columns";
import { cn } from "@/lib/utils";

/**
 * Fila de hábito del bloque de Hoy (tarea 4.1/4.3 de fase 3): versión
 * compacta de `HabitCard` sin mini-mapa, racha ni menú de acciones — Hoy
 * convive con las tareas, no es la pantalla de administración de hábitos
 * (`/habitos` ya cubre eso). Mismo casillero y misma mutación de marcar/
 * desmarcar que `HabitCard` (D-E: solo hoy). Sin `SelectionCheckbox` ni
 * lugar en `candidateTasks` de `HoyView` (tarea 4.4): un hábito nunca es
 * candidato de la selección múltiple de tareas.
 *
 * Muestra la hora efectiva (`effectiveTime`, ya resuelta por el llamador con
 * `lib/habits/today.ts#habitsDueTodayWithEffectiveTime`): la del override de
 * hoy si existe, si no la habitual. Reprogramar el horario de hoy sigue
 * siendo una acción de la tarjeta completa (tarea 3.11), que esta fila no
 * ofrece — pero si ya se reprogramó desde ahí, acá se tiene que ver.
 */
export function HabitTodayRow({
  habit,
  effectiveTime,
  todayDate,
  timezone,
}: {
  habit: Habit;
  effectiveTime: string | null;
  todayDate: string;
  timezone: string;
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const { timeFormat } = useUserPreferences();
  const hex = resolveProjectColorHex(habit.color, mounted && resolvedTheme === "dark" ? "dark" : "light");

  const mark = useMarkHabitDone();
  const unmark = useUnmarkHabitDone();

  function toggleDone() {
    const variables = { habitId: habit.id, date: todayDate, timezone };
    if (habit.completed_today) unmark.mutate(variables);
    else mark.mutate(variables);
  }

  return (
    <li className="flex items-center gap-1.5 rounded-md px-1 py-1.5 hover:bg-surface">
      <button
        type="button"
        role="checkbox"
        aria-checked={habit.completed_today}
        aria-label={habit.completed_today ? `Desmarcar ${habit.name} de hoy` : `Marcar ${habit.name} como hecho hoy`}
        onClick={toggleDone}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          habit.completed_today ? "border-primary bg-primary" : "border-input",
        )}
      >
        {habit.completed_today && <span aria-hidden className="size-1.5 rounded-full bg-primary-foreground" />}
      </button>

      <span aria-hidden className="text-base leading-none">
        {habit.icon}
      </span>
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm text-foreground",
          habit.completed_today && "text-text-secondary line-through",
        )}
      >
        {habit.name}
      </span>

      <span className="shrink-0 text-xs text-text-secondary">{formatHabitTime(effectiveTime, timeFormat)}</span>
    </li>
  );
}
