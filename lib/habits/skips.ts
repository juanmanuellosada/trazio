"use client";

import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { dataWindowChunks, isoWeekEnd } from "@/lib/dates/data-window";
import { reportHabitError } from "./errors";
import { assertAppliesOnDate } from "./schedule-overrides";
import type { HabitScheduleFields } from "./today";

/**
 * Saltear un hábito un día puntual (grupo 6 de `calendario-legible-y-manipulable`,
 * D-F): decisión del dueño — "si en un hábito me salteé un día, ese día
 * queda ahí fijo en el calendario. Si yo después lo completo se actualiza
 * la racha." De ahí sale que el salteo vive en su propia tabla
 * (`habit_skips`, ver el comentario de la migración
 * `20260805000000_habit_skips.sql` con la justificación completa) en vez de
 * en `habit_completions` o `habit_schedule_overrides`: la racha
 * (`calcular_racha_habito`) solo lee `habit_completions`, así que esta
 * tabla queda fuera de su alcance por construcción — saltear nunca puede
 * colarse en el cálculo de racha (regla 6.5 de `tasks.md`).
 *
 * Mismo patrón que `schedule-overrides.ts`: dos formas de leer (por hábito
 * y por fecha) bajo un mismo prefijo de clave para invalidar las dos con
 * una sola llamada, y `date` como parte de la clave porque el calendario
 * puede saltear varios días del mismo hábito en la misma sesión.
 */
const SKIPS_QUERY_BASE = ["habits", "skips"] as const;
export const HABIT_SKIPS_MUTATION_KEY = SKIPS_QUERY_BASE;

export function habitSkipQueryKey(habitId: string, date: string) {
  return [...SKIPS_QUERY_BASE, habitId, date] as const;
}

export function habitSkipsByDateQueryKey(date: string) {
  return [...SKIPS_QUERY_BASE, "date", date] as const;
}

/**
 * Saltea un hábito en `date` (tarea 6.1/6.3): un `insert` en `habit_skips`,
 * rechazado antes de llegar a la base si ese día no le corresponde al
 * hábito por su frecuencia — la misma guarda que usa la reprogramación
 * puntual (`assertAppliesOnDate`), pedida explícitamente para este caso
 * también. No valida si el día ya está completado: el menú que ofrece
 * "Saltear" decide cuándo mostrarlo, esta mutación es la operación de
 * datos, no la política de la interfaz.
 *
 * Optimista, mismo criterio que `.claude/rules/frontend.md` y el resto de
 * este módulo: el salteo se ve al instante en las dos lecturas de acá, y se
 * revierte con aviso si el servidor lo rechaza.
 */
export function useSkipHabit() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABIT_SKIPS_MUTATION_KEY,
    mutationFn: async ({
      habitId,
      habit,
      date,
      timezone,
    }: {
      habitId: string;
      habit: HabitScheduleFields;
      date: string;
      timezone: string;
    }) => {
      assertAppliesOnDate(habit, date, timezone);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { error } = await supabase
        .from("habit_skips")
        .insert({ user_id: session.user.id, habit_id: habitId, date });
      if (error) throw error;
    },
    onMutate: async ({ habitId, date }) => {
      await queryClient.cancelQueries({ queryKey: habitSkipQueryKey(habitId, date) });
      await queryClient.cancelQueries({ queryKey: habitSkipsByDateQueryKey(date) });
      const previousByHabit = queryClient.getQueryData<boolean>(habitSkipQueryKey(habitId, date));
      const previousByDate = queryClient.getQueryData<Record<string, boolean>>(habitSkipsByDateQueryKey(date));
      queryClient.setQueryData(habitSkipQueryKey(habitId, date), true);
      queryClient.setQueryData<Record<string, boolean>>(habitSkipsByDateQueryKey(date), (old) => ({
        ...old,
        [habitId]: true,
      }));
      return { previousByHabit, previousByDate, habitId, date };
    },
    onError: (error, _vars, context) => {
      if (context) {
        queryClient.setQueryData(habitSkipQueryKey(context.habitId, context.date), context.previousByHabit);
        queryClient.setQueryData(habitSkipsByDateQueryKey(context.date), context.previousByDate);
      }
      reportHabitError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SKIPS_QUERY_BASE }),
  });
}

/**
 * Revierte el salteo de un día (tarea "revertir el estado salteado"):
 * corrige un salteo hecho sin querer, sin completar el hábito — completar
 * después de saltear es un camino aparte, `useMarkHabitDone`, que además
 * limpia cualquier salteo de ese día (`mutations.ts`) para que los tres
 * estados (pendiente, cumplido, salteado) nunca se superpongan (tarea 6.2).
 */
export function useUnskipHabit() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABIT_SKIPS_MUTATION_KEY,
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      const { error } = await supabase.from("habit_skips").delete().eq("habit_id", habitId).eq("date", date);
      if (error) throw error;
    },
    onMutate: async ({ habitId, date }: { habitId: string; date: string }) => {
      await queryClient.cancelQueries({ queryKey: habitSkipQueryKey(habitId, date) });
      await queryClient.cancelQueries({ queryKey: habitSkipsByDateQueryKey(date) });
      const previousByHabit = queryClient.getQueryData<boolean>(habitSkipQueryKey(habitId, date));
      const previousByDate = queryClient.getQueryData<Record<string, boolean>>(habitSkipsByDateQueryKey(date));
      queryClient.setQueryData(habitSkipQueryKey(habitId, date), false);
      queryClient.setQueryData<Record<string, boolean> | undefined>(habitSkipsByDateQueryKey(date), (old) => {
        if (!old) return old;
        return Object.fromEntries(Object.entries(old).filter(([id]) => id !== habitId));
      });
      return { previousByHabit, previousByDate, habitId, date };
    },
    onError: (error, _vars, context) => {
      if (context) {
        queryClient.setQueryData(habitSkipQueryKey(context.habitId, context.date), context.previousByHabit);
        queryClient.setQueryData(habitSkipsByDateQueryKey(context.date), context.previousByDate);
      }
      reportHabitError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SKIPS_QUERY_BASE }),
  });
}

/** Si un hábito está salteado en una fecha puntual. */
export function useHabitSkip(habitId: string, date: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: habitSkipQueryKey(habitId, date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_skips")
        .select("habit_id")
        .eq("habit_id", habitId)
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
  });
}

/**
 * Salteos de todos los hábitos del usuario para una fecha, en un mapa
 * `habit_id -> true` (para que el bloque de calendario de esa fecha sepa,
 * de un vistazo, qué hábitos están salteados ese día — la lectura la
 * cablea otra tanda, esto solo la deja disponible). Mismo criterio que
 * `useHabitScheduleOverridesForDate`: una sola consulta para todos los
 * hábitos del día en vez de una por hábito.
 */
export function useHabitSkipsForDate(date: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: habitSkipsByDateQueryKey(date),
    queryFn: async () => {
      const { data, error } = await supabase.from("habit_skips").select("habit_id").eq("date", date);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((row) => [row.habit_id, true])) as Record<string, boolean>;
    },
  });
}

/**
 * Salteos de varios días a la vez, agrupados por fecha (grupo 7 de
 * `calendario-legible-y-manipulable`, "montar `CalendarView`"; pasado a
 * trozos de semana ISO en la tarea 5.2, `design.md` decisión 4): un pedido
 * por cada semana ISO que cubre el rango visible más el margen
 * (`dataWindowChunks`), mismo criterio que `useHabitScheduleOverridesForRange`
 * y `useCalendarRangeEvents` — correrse un día reutiliza los trozos que ya
 * estaban en caché.
 */
export function useHabitSkipsForRange(dates: string[]) {
  const supabase = createClient();
  const chunks = dataWindowChunks(dates);

  const queries = useQueries({
    queries: chunks.map((weekStart) => ({
      queryKey: [...SKIPS_QUERY_BASE, "range", "chunk", weekStart] as const,
      queryFn: async (): Promise<Record<string, Record<string, boolean>>> => {
        const { data, error } = await supabase
          .from("habit_skips")
          .select("habit_id, date")
          .gte("date", weekStart)
          .lte("date", isoWeekEnd(weekStart));
        if (error) throw error;
        const byDate: Record<string, Record<string, boolean>> = {};
        for (const row of data ?? []) {
          (byDate[row.date] ??= {})[row.habit_id] = true;
        }
        return byDate;
      },
    })),
  });

  const data = useMemo(() => {
    const merged: Record<string, Record<string, boolean>> = {};
    for (const query of queries) {
      for (const [date, byHabit] of Object.entries(query.data ?? {})) merged[date] = { ...merged[date], ...byHabit };
    }
    return merged;
  }, [queries]);

  return { data };
}
