"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { defaultOptionsForViewKey, parseViewOptions, type ViewOptions } from "./schema";

export function viewPreferencesQueryKey(viewKey: string) {
  return ["view-preferences", viewKey] as const;
}

/**
 * Opciones de vista de una pantalla (bloque 6.2): se sincronizan entre
 * dispositivos porque viven en `view_preferences`, no en `localStorage
 * (requirement "Las opciones se sincronizan entre dispositivos"). Sin
 * sesión (no debería pasar detrás del layout protegido) devuelve los
 * defaults en vez de reventar la vista.
 */
export async function fetchViewPreferences(viewKey: string): Promise<ViewOptions> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return defaultOptionsForViewKey(viewKey);

  const { data, error } = await supabase
    .from("view_preferences")
    .select("options")
    .eq("user_id", session.user.id)
    .eq("view_key", viewKey)
    .maybeSingle();
  if (error) throw error;

  return parseViewOptions(viewKey, data?.options ?? null);
}

export function useViewPreferences(viewKey: string, initialData?: ViewOptions) {
  return useQuery({
    queryKey: viewPreferencesQueryKey(viewKey),
    queryFn: () => fetchViewPreferences(viewKey),
    initialData,
  });
}
