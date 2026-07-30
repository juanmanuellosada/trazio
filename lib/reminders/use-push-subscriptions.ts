"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type PushSubscriptionRow = { id: string; endpoint: string; created_at: string };

export const pushSubscriptionsQueryKey = ["reminders", "push-subscriptions"] as const;

/** Dispositivos suscritos a push del usuario actual (bloque 4.9, spec "ver los dispositivos suscritos"). RLS ya acota a los propios. */
export async function fetchPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function usePushSubscriptions() {
  return useQuery({ queryKey: pushSubscriptionsQueryKey, queryFn: fetchPushSubscriptions });
}
