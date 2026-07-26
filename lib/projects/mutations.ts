"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import type { ProjectFormOutput } from "@/lib/validation/projects";
import { reportProjectError } from "./errors";
import { needsRebalance, nextSiblingPosition, siblingsOf, subtreeIds } from "./tree";
import { projectsQueryKey, type ProjectRow } from "./use-projects";

function snapshot(queryClient: QueryClient) {
  return queryClient.getQueryData<ProjectRow[]>(projectsQueryKey);
}

/**
 * `mutationKey` común a todas las mutaciones de este módulo (bloque 10.3,
 * regla D3): `lib/realtime/handlers.ts` lo usa con `queryClient.isMutating`
 * para saber si hay alguna en vuelo antes de invalidar por un evento de
 * Realtime sobre `projects`.
 */
export const PROJECTS_MUTATION_KEY = ["projects"] as const;

/**
 * Crea un proyecto (bloque 6.2). No es optimista: el `id` lo asigna el
 * servidor y hace falta antes de poder navegar o editar el proyecto nuevo.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: PROJECTS_MUTATION_KEY,
    mutationFn: async (input: ProjectFormOutput & { parentId: string | null }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const projects = snapshot(queryClient) ?? [];
      const position = nextSiblingPosition(projects, input.parentId);

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: session.user.id,
          name: input.name,
          color: input.color,
          icon: input.icon,
          description: input.description || null,
          parent_id: input.parentId,
          position,
        })
        .select(
          "id, name, color, icon, description, parent_id, is_inbox, is_favorite, is_archived, position",
        )
        .single();
      if (error) throw error;
      return data as ProjectRow;
    },
    onSuccess: () => toastSuccess("Proyecto creado."),
    onError: reportProjectError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  });
}

export type ProjectPatch = Partial<
  Pick<ProjectRow, "name" | "color" | "icon" | "description" | "is_favorite" | "is_archived">
>;

/**
 * Actualiza campos de un proyecto: edición (nombre/color/ícono/descripción),
 * favorito y archivado comparten el mismo camino optimista (D2): se aplica
 * al instante, se revierte y avisa si el servidor rechaza.
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: PROJECTS_MUTATION_KEY,
    mutationFn: async ({ id, patch }: { id: string; patch: ProjectPatch }) => {
      const { error } = await supabase.from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: projectsQueryKey });
      const previous = snapshot(queryClient);
      queryClient.setQueryData<ProjectRow[]>(projectsQueryKey, (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(projectsQueryKey, context.previous);
      reportProjectError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  });
}

/**
 * Mueve un proyecto: reordenarlo entre hermanos (mismo `parentId`) o
 * anidarlo bajo otro padre (`parentId` distinto), por arrastre, por
 * "mover arriba/abajo" o por el diálogo "Mover a..." (bloque 6.6). El
 * cliente no reimplementa el tope de 3 niveles ni la regla de ciclos: los
 * valida el propio trigger de la base, acá solo se interpreta el rechazo.
 */
export function useMoveProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: PROJECTS_MUTATION_KEY,
    mutationFn: async ({
      id,
      parentId,
      position,
    }: {
      id: string;
      parentId: string | null;
      position: number;
    }) => {
      const { error } = await supabase
        .from("projects")
        .update({ parent_id: parentId, position })
        .eq("id", id);
      if (error) throw error;

      const projects = snapshot(queryClient) ?? [];
      const siblingPositions = siblingsOf(projects, parentId, id).map((p) => p.position);
      if (needsRebalance(siblingPositions, position)) {
        await supabase.rpc("rebalance_project_positions", { p_parent_id: parentId ?? undefined });
      }
    },
    onMutate: async ({ id, parentId, position }) => {
      await queryClient.cancelQueries({ queryKey: projectsQueryKey });
      const previous = snapshot(queryClient);
      queryClient.setQueryData<ProjectRow[]>(projectsQueryKey, (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, parent_id: parentId, position } : p)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(projectsQueryKey, context.previous);
      reportProjectError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  });
}

/**
 * Elimina un proyecto (bloque 6.5): borra en cascada sus secciones y todas
 * sus tareas, y no es reversible (por eso, a diferencia del resto de las
 * acciones destructivas de `.claude/rules/frontend.md`, el toast no ofrece
 * deshacer — el spec de `proyectos-secciones` lo prohíbe explícitamente).
 * El diálogo de confirmación con el conteo real vive en
 * `components/projects/delete-project-dialog.tsx`; acá solo se ejecuta.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: PROJECTS_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: projectsQueryKey });
      const previous = snapshot(queryClient);
      const removeIds = new Set(subtreeIds(previous ?? [], id));
      queryClient.setQueryData<ProjectRow[]>(projectsQueryKey, (old) =>
        (old ?? []).filter((p) => !removeIds.has(p.id)),
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(projectsQueryKey, context.previous);
      reportProjectError(error);
    },
    onSuccess: () => toastSuccess("Proyecto eliminado. Esta acción no se puede deshacer."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  });
}
