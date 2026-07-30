"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

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
 * Badge del ícono de la aplicación (bloque 4.16) con los recordatorios de
 * hoy aún no entregados. Punto de extensión para fase 3: cuando existan
 * hábitos pendientes del día, sumar su conteo acá, al lado del de
 * recordatorios, antes de llamar a `setAppBadge` — no antes.
 */
export function useAppBadge(): void {
  const { data: reminderCount } = useQuery({
    queryKey: appBadgeQueryKey,
    queryFn: fetchTodayPendingReminderCount,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    const total = reminderCount ?? 0; // + conteo de hábitos pendientes (fase 3)
    if (total > 0) {
      void navigator.setAppBadge(total).catch(() => {});
    } else {
      void navigator.clearAppBadge?.().catch(() => {});
    }
  }, [reminderCount]);
}
