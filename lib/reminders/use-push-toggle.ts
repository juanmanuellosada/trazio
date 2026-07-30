"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { subscribeToPush, unsubscribeFromPush } from "./subscribe";
import { reportReminderError } from "./errors";
import { pushSubscriptionsQueryKey } from "./use-push-subscriptions";

/** Activa los recordatorios push en este dispositivo (bloque 4.8/4.9). */
export function useSubscribePush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscribeToPush,
    onSuccess: () => {
      toastSuccess("Notificaciones activadas en este dispositivo.");
      queryClient.invalidateQueries({ queryKey: pushSubscriptionsQueryKey });
    },
    onError: reportReminderError,
  });
}

/** Desactiva los recordatorios push en este dispositivo. */
export function useUnsubscribePush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unsubscribeFromPush,
    onSuccess: () => {
      toastSuccess("Notificaciones desactivadas en este dispositivo.");
      queryClient.invalidateQueries({ queryKey: pushSubscriptionsQueryKey });
    },
    onError: reportReminderError,
  });
}

/** Quita la suscripción de un dispositivo distinto al actual, desde la lista de Configuración. */
export function useRemovePushSubscription() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("push_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pushSubscriptionsQueryKey }),
    onError: reportReminderError,
  });
}
