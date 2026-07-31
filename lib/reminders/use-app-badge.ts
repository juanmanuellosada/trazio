"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { fetchHabits, habitsQueryKey } from "@/lib/habits/use-habits";
import { countHabitsPendingToday } from "@/lib/habits/pending-today";
import { useUserPreferences } from "@/components/providers/preferences-provider";

export const appBadgeQueryKey = ["reminders", "badge-count"] as const;

/** Límites del día calendario en la zona del propio navegador (misma simplificación que otros puntos del cliente: sin pasar por `lib/dates/`, D9 no aplica acá porque `remind_at` siempre es un instante). */
function todayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Recordatorios de hoy todavía no entregados (spec "Badge del ícono con los pendientes del día"). */
async function fetchTodayPendingReminderCount(): Promise<number> {
  const supabase = createClient();
  const { start, end } = todayRange();
  const { count, error } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .is("delivered_at", null)
    .gte("remind_at", start)
    .lt("remind_at", end);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Badge del ícono de la aplicación (bloque 4.16, ampliado en fase 3) con los
 * recordatorios de hoy aún no entregados más los hábitos pendientes de hoy
 * (`lib/habits/pending-today.ts`, D-H de `design.md`: este badge es un
 * camino de código independiente del contador de Hoy en el panel lateral,
 * pero comparte con él la misma definición de "pendiente"). La query de
 * hábitos usa `habitsQueryKey()`, la misma clave que `useHabits`, para
 * compartir caché con el resto de la app en vez de duplicar el fetch.
 */
export function useAppBadge(): void {
  const { timezone } = useUserPreferences();
  const { data: reminderCount } = useQuery({
    queryKey: appBadgeQueryKey,
    queryFn: fetchTodayPendingReminderCount,
    refetchInterval: 60_000,
  });
  const { data: habits } = useQuery({
    queryKey: habitsQueryKey(),
    queryFn: () => fetchHabits(timezone),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    const pendingHabits = habits ? countHabitsPendingToday(habits, timezone, new Date()) : 0;
    const total = (reminderCount ?? 0) + pendingHabits;
    if (total > 0) {
      void navigator.setAppBadge(total).catch(() => {});
    } else {
      void navigator.clearAppBadge?.().catch(() => {});
    }
  }, [reminderCount, habits, timezone]);
}
