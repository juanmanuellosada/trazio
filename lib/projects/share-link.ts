"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { reportProjectError } from "./errors";

/**
 * Capa de datos del enlace de lectura de un proyecto
 * (`enlace-de-lectura-de-un-proyecto`, bloque 4): separada de
 * `lib/projects/mutations.ts` a propósito, para no meter `share_token` —el
 * secreto en sí— en `ProjectRow`/`PROJECT_COLUMNS`
 * (`lib/projects/use-projects.ts`), que alimenta el panel lateral y se
 * carga en cada pantalla. Acá se consulta solo cuando hace falta: mientras
 * `ProjectHeader` está montado en la página de un proyecto puntual, no en
 * cada ruta de la app.
 */
function shareLinkQueryKey(projectId: string) {
  return ["project-share-link", projectId] as const;
}

/**
 * `share_token` de un proyecto, o `null` si no está compartido. Alimenta
 * tanto la indicación "Compartido" del encabezado como el diálogo de
 * compartir. `enabled: false` para la Bandeja de entrada
 * (`ProjectHeader` no le renderiza ni el menú ni esta indicación —
 * `project-header.tsx`—, así que tampoco tiene sentido gastar el pedido).
 */
export function useProjectShareLink(projectId: string, enabled = true) {
  const supabase = createClient();

  return useQuery({
    queryKey: shareLinkQueryKey(projectId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("share_token").eq("id", projectId).single();
      if (error) throw error;
      return data.share_token;
    },
  });
}

/**
 * Genera o regenera el enlace (D-A: son la misma operación) vía la función
 * `security invoker` `regenerate_project_share_token`
 * (20260809020000_projects_share_token.sql) — la RLS de `projects` decide
 * si el proyecto es tuyo, esta capa no reimplementa ese chequeo.
 */
export function useGenerateProjectShareLink(projectId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("regenerate_project_share_token", { p_project_id: projectId });
      if (error) throw error;
      return data;
    },
    onSuccess: (token) => queryClient.setQueryData(shareLinkQueryKey(projectId), token),
    onError: reportProjectError,
  });
}

/** Desactiva el enlace: mismo camino que cualquier otro campo de `projects` (RLS de `projects_update_own`), sin necesitar una función propia. */
export function useDeactivateProjectShareLink(projectId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").update({ share_token: null }).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.setQueryData(shareLinkQueryKey(projectId), null),
    onError: reportProjectError,
  });
}
