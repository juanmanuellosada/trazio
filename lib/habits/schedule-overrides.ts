"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { reportHabitError } from "./errors";
import { habitAppliesOnDate, type HabitScheduleFields } from "./today";

/** Prefijo común: `mutationKey` (no `HABITS_MUTATION_KEY` de `mutations.ts`, un override no cambia nada en `habitsQueryKey`) y base de las dos formas de leer overrides (por hábito y por fecha), para invalidar las dos con una sola llamada. */
const SCHEDULE_OVERRIDES_QUERY_BASE = ["habits", "schedule-overrides"] as const;
export const HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY = SCHEDULE_OVERRIDES_QUERY_BASE;

/**
 * `date` es parte de la clave (tarea 6.5/6.6, D-H): antes de ampliar la
 * guarda a cualquier día, esto solo se leía para "hoy" en toda la app, así
 * que faltaba en la clave sin que se notara — dos fechas distintas del
 * mismo hábito habrían compartido caché. El calendario puede reprogramar
 * varios días del mismo hábito en la misma sesión, así que ahora sí hace
 * falta distinguirlas.
 */
export function habitScheduleOverridesQueryKey(habitId: string, date: string) {
  return [...SCHEDULE_OVERRIDES_QUERY_BASE, habitId, date] as const;
}

export function habitScheduleOverridesByDateQueryKey(date: string) {
  return [...SCHEDULE_OVERRIDES_QUERY_BASE, "date", date] as const;
}

/**
 * Guarda ampliada (tarea 6.5, D-H): hasta la fase 3 esta función solo se
 * llamaba con el día de hoy, así que alcanzaba con mirar la frecuencia
 * (`habitAppliesOnDate`). El calendario permite programar cualquier día
 * que le toque al hábito, no solo hoy, así que ahora también rechaza un
 * día anterior a la creación del hábito y un hábito archivado — las mismas
 * dos condiciones que ya usa `isHabitDueOn` para "qué hábitos tocan hoy",
 * generalizadas a cualquier fecha. Aflojar de más (dejar pasar cualquier
 * fecha) sería peor que no tocar esto: por eso cada rechazo existente sigue
 * intacto, esto solo agrega los dos que faltaban.
 */
export function assertAppliesOnDate(habit: HabitScheduleFields, date: string, timezone: string): void {
  if (habit.is_archived) {
    throw new Error("Ese hábito está archivado.");
  }
  const createdDate = formatInTimeZone(habit.created_at, timezone, "yyyy-MM-dd");
  if (date < createdDate) {
    throw new Error("Ese día es anterior a la creación del hábito.");
  }
  if (!habitAppliesOnDate(habit, date)) {
    throw new Error("Ese día no le corresponde al hábito según su frecuencia.");
  }
}

/**
 * Reprograma la hora de un hábito para un día puntual (tarea 2.6/6.6,
 * requirement "Reprogramación puntual del horario, sin mover el hábito de
 * día"): un `upsert` sobre `habit_schedule_overrides` sin tocar
 * `habits.scheduled_time`. Rechazado antes de llegar a la base si esa
 * fecha no le corresponde al hábito — el mecanismo solo cambia el horario
 * dentro de un día que ya le toca, nunca lo hace aparecer en uno distinto
 * ni en uno anterior a que existiera.
 *
 * Optimista (tarea 6.9, `.claude/rules/frontend.md`): el override puntual
 * se ve al instante en las dos lecturas de este módulo, y se revierte con
 * aviso si el servidor lo rechaza.
 */
export function useSetHabitScheduleOverride() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY,
    mutationFn: async ({
      habitId,
      habit,
      date,
      scheduledTime,
      timezone,
    }: {
      habitId: string;
      habit: HabitScheduleFields;
      date: string;
      scheduledTime: string;
      timezone: string;
    }) => {
      assertAppliesOnDate(habit, date, timezone);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { error } = await supabase
        .from("habit_schedule_overrides")
        .upsert(
          { user_id: session.user.id, habit_id: habitId, date, scheduled_time: scheduledTime },
          { onConflict: "habit_id,date" },
        );
      if (error) throw error;
    },
    onMutate: async ({ habitId, date, scheduledTime }) => {
      await queryClient.cancelQueries({ queryKey: habitScheduleOverridesQueryKey(habitId, date) });
      await queryClient.cancelQueries({ queryKey: habitScheduleOverridesByDateQueryKey(date) });
      const previousByHabit = queryClient.getQueryData<string | null>(habitScheduleOverridesQueryKey(habitId, date));
      const previousByDate = queryClient.getQueryData<Record<string, string>>(habitScheduleOverridesByDateQueryKey(date));
      queryClient.setQueryData(habitScheduleOverridesQueryKey(habitId, date), scheduledTime);
      queryClient.setQueryData<Record<string, string>>(habitScheduleOverridesByDateQueryKey(date), (old) => ({
        ...old,
        [habitId]: scheduledTime,
      }));
      return { previousByHabit, previousByDate, habitId, date };
    },
    onError: (error, _vars, context) => {
      if (context) {
        queryClient.setQueryData(habitScheduleOverridesQueryKey(context.habitId, context.date), context.previousByHabit);
        queryClient.setQueryData(habitScheduleOverridesByDateQueryKey(context.date), context.previousByDate);
      }
      reportHabitError(error);
    },
    onSuccess: () => toastSuccess("Horario reprogramado para ese día."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_OVERRIDES_QUERY_BASE }),
  });
}

/**
 * Hora reprogramada de un hábito para una fecha puntual, si existe (tarea
 * 3.11): no hay un hook de lectura para este módulo todavía, solo las
 * mutaciones de arriba. Misma `queryKey` que usan
 * `useSetHabitScheduleOverride`/`useRemoveHabitScheduleOverride` para
 * invalidar, así que guardar o quitar una reprogramación refresca esta
 * lectura sin un caso especial.
 */
export function useHabitScheduleOverride(habitId: string, date: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: habitScheduleOverridesQueryKey(habitId, date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_schedule_overrides")
        .select("scheduled_time")
        .eq("habit_id", habitId)
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;
      return data?.scheduled_time ?? null;
    },
  });
}

/** Quita la reprogramación puntual de un día: el hábito vuelve a su `scheduled_time` habitual ese día. Optimista (tarea 6.9), mismo criterio que `useSetHabitScheduleOverride`. */
export function useRemoveHabitScheduleOverride() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY,
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      const { error } = await supabase
        .from("habit_schedule_overrides")
        .delete()
        .eq("habit_id", habitId)
        .eq("date", date);
      if (error) throw error;
    },
    onMutate: async ({ habitId, date }) => {
      await queryClient.cancelQueries({ queryKey: habitScheduleOverridesQueryKey(habitId, date) });
      await queryClient.cancelQueries({ queryKey: habitScheduleOverridesByDateQueryKey(date) });
      const previousByHabit = queryClient.getQueryData<string | null>(habitScheduleOverridesQueryKey(habitId, date));
      const previousByDate = queryClient.getQueryData<Record<string, string>>(habitScheduleOverridesByDateQueryKey(date));
      queryClient.setQueryData(habitScheduleOverridesQueryKey(habitId, date), null);
      queryClient.setQueryData<Record<string, string> | undefined>(habitScheduleOverridesByDateQueryKey(date), (old) => {
        if (!old) return old;
        return Object.fromEntries(Object.entries(old).filter(([id]) => id !== habitId));
      });
      return { previousByHabit, previousByDate, habitId, date };
    },
    onError: (error, _vars, context) => {
      if (context) {
        queryClient.setQueryData(habitScheduleOverridesQueryKey(context.habitId, context.date), context.previousByHabit);
        queryClient.setQueryData(habitScheduleOverridesByDateQueryKey(context.date), context.previousByDate);
      }
      reportHabitError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_OVERRIDES_QUERY_BASE }),
  });
}

/**
 * Overrides de hoy de todos los hábitos del usuario, en un mapa
 * `habit_id -> scheduled_time` (tarea 4.x, bug de fase 3: el bloque de
 * hábitos de Hoy tiene que mostrar la hora reprogramada, no la habitual).
 * Una sola consulta para todos los hábitos del día en vez de una por hábito
 * — `useHabitScheduleOverride` sigue existiendo tal cual para la tarjeta de
 * `/habitos`, que solo necesita el override de un hábito puntual al abrir
 * su popover de reprogramar. RLS ya acota a los propios.
 */
export function useHabitScheduleOverridesForDate(date: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: habitScheduleOverridesByDateQueryKey(date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_schedule_overrides")
        .select("habit_id, scheduled_time")
        .eq("date", date);
      if (error) throw error;
      const entries = (data ?? []).map((row) => [row.habit_id, row.scheduled_time]);
      return Object.fromEntries(entries) as Record<string, string>;
    },
  });
}
