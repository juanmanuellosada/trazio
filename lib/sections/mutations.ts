"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { needsRebalance, positionForIndex, SIBLING_SPACING } from "@/lib/projects/tree";
import type { SectionFormInput } from "@/lib/validation/sections";
import { reportSectionError } from "./errors";
import { sectionsQueryKey, type SectionRow } from "./use-sections";

function snapshot(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  return queryClient.getQueryData<SectionRow[]>(sectionsQueryKey(projectId));
}

/** Crea una sección al final del proyecto (bloque 6.8). */
export function useCreateSection(projectId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const key = sectionsQueryKey(projectId);

  return useMutation({
    mutationFn: async (input: SectionFormInput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const sections = snapshot(queryClient, projectId) ?? [];
      const position =
        sections.length === 0
          ? SIBLING_SPACING
          : sections[sections.length - 1].position + SIBLING_SPACING;

      const { data, error } = await supabase
        .from("sections")
        .insert({ user_id: session.user.id, project_id: projectId, name: input.name, position })
        .select("id, project_id, name, position, is_collapsed")
        .single();
      if (error) throw error;
      return data as SectionRow;
    },
    onError: reportSectionError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export type SectionPatch = Partial<Pick<SectionRow, "name" | "is_collapsed">>;

/** Renombrar y colapsar/expandir comparten el mismo camino optimista. */
export function useUpdateSection(projectId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const key = sectionsQueryKey(projectId);

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SectionPatch }) => {
      const { error } = await supabase.from("sections").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = snapshot(queryClient, projectId);
      queryClient.setQueryData<SectionRow[]>(key, (old) =>
        (old ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      reportSectionError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** Reordena una sección entre las demás del mismo proyecto, por arrastre o por menú (bloque 6.6/6.8). */
export function useMoveSection(projectId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const key = sectionsQueryKey(projectId);

  return useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      const { error } = await supabase.from("sections").update({ position }).eq("id", id);
      if (error) throw error;

      const sections = snapshot(queryClient, projectId) ?? [];
      const siblingPositions = sections.filter((s) => s.id !== id).map((s) => s.position);
      if (needsRebalance(siblingPositions, position)) {
        await supabase.rpc("rebalance_section_positions", { p_project_id: projectId });
      }
    },
    onMutate: async ({ id, position }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = snapshot(queryClient, projectId);
      queryClient.setQueryData<SectionRow[]>(key, (old) =>
        (old ?? []).map((s) => (s.id === id ? { ...s, position } : s)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      reportSectionError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * Elimina una sección (bloque 6.8/6.9). Sus tareas **no** se borran: quedan
 * sin sección dentro del mismo proyecto por el `ON DELETE SET NULL` de
 * `tasks.section_id` (migración `20260726011609_tasks.sql`) — el cliente no
 * reimplementa esa regla, solo dispara el borrado.
 */
export function useDeleteSection(projectId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const key = sectionsQueryKey(projectId);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = snapshot(queryClient, projectId);
      queryClient.setQueryData<SectionRow[]>(key, (old) => (old ?? []).filter((s) => s.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      reportSectionError(error);
    },
    onSuccess: () => toastSuccess("Sección eliminada. Sus tareas quedaron sin sección."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export { positionForIndex };
