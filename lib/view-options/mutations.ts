"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { reportViewOptionsError } from "./errors";
import { defaultOptionsForViewKey, type ViewOptions } from "./schema";
import { viewPreferencesQueryKey } from "./use-view-preferences";

/**
 * Cambia una o más opciones de la pantalla actual (bloque 6.2), con
 * optimistic update: `upsert` sobre la PK compuesta `(user_id, view_key)`
 * porque la fila puede no existir todavía (usuario que nunca tocó esta
 * pantalla). El botón "restablecer" (bloque 6.3) usa este mismo hook,
 * pasando `defaultOptionsForViewKey(viewKey)` completo como `patch`.
 */
export function useUpdateViewOptions(viewKey: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: ["view-preferences", viewKey] as const,
    mutationFn: async (patch: Partial<ViewOptions>) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const current =
        queryClient.getQueryData<ViewOptions>(viewPreferencesQueryKey(viewKey)) ?? defaultOptionsForViewKey(viewKey);
      const next: ViewOptions = { ...current, ...patch };

      const { error } = await supabase
        .from("view_preferences")
        .upsert({ user_id: session.user.id, view_key: viewKey, options: next }, { onConflict: "user_id,view_key" });
      if (error) throw error;
      return next;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: viewPreferencesQueryKey(viewKey) });
      const previous = queryClient.getQueryData<ViewOptions>(viewPreferencesQueryKey(viewKey));
      queryClient.setQueryData<ViewOptions>(viewPreferencesQueryKey(viewKey), (old) => ({
        ...(old ?? defaultOptionsForViewKey(viewKey)),
        ...patch,
      }));
      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(viewPreferencesQueryKey(viewKey), context.previous);
      reportViewOptionsError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: viewPreferencesQueryKey(viewKey) }),
  });
}
