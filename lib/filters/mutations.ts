"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import type { FilterFormOutput } from "@/lib/validation/filters";
import { reportFilterError } from "./errors";
import { filtersQueryKey, type FilterRow } from "./use-filters";
import { filterDetailQueryKey } from "./use-filter";

/**
 * Mutaciones de filtros (bloque 2.12): crear, renombrar, cambiar consulta,
 * color, ícono y favorito, y eliminar — mismo patrón optimista que
 * `lib/labels/mutations.ts`. `mutationKey` común para que
 * `lib/realtime/handlers.ts` pueda usar `queryClient.isMutating` (D3), igual
 * que el resto de los módulos de mutaciones.
 */
export const FILTERS_MUTATION_KEY = ["filters"] as const;

function listSnapshot(queryClient: QueryClient) {
  return queryClient.getQueryData<FilterRow[]>(filtersQueryKey);
}

/** Crea un filtro (bloque 2.12/2.13): no es optimista, el `id` lo asigna el servidor. */
export function useCreateFilter() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: FILTERS_MUTATION_KEY,
    mutationFn: async (input: FilterFormOutput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { data, error } = await supabase
        .from("filters")
        .insert({
          user_id: session.user.id,
          name: input.name,
          query: input.query,
          color: input.color,
          icon: input.icon,
          is_favorite: input.isFavorite,
        })
        .select("id, name, query, color, icon, is_favorite")
        .single();
      if (error) throw error;
      return data as FilterRow;
    },
    onSuccess: () => toastSuccess("Filtro creado."),
    onError: reportFilterError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: filtersQueryKey }),
  });
}

export type FilterPatch = Partial<Pick<FilterRow, "name" | "query" | "color" | "icon" | "is_favorite">>;

/** Renombra o edita un filtro existente (bloque 2.12/2.13/2.15): nombre, consulta, color, ícono o favorito, todos por el mismo camino optimista. */
export function useUpdateFilter() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: FILTERS_MUTATION_KEY,
    mutationFn: async ({ id, patch }: { id: string; patch: FilterPatch }) => {
      const { error } = await supabase.from("filters").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: filtersQueryKey });
      await queryClient.cancelQueries({ queryKey: filterDetailQueryKey(id) });

      const previousList = listSnapshot(queryClient);
      const previousDetail = queryClient.getQueryData<FilterRow>(filterDetailQueryKey(id));

      queryClient.setQueryData<FilterRow[]>(filtersQueryKey, (old) =>
        (old ?? []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
      queryClient.setQueryData<FilterRow>(filterDetailQueryKey(id), (old) => (old ? { ...old, ...patch } : old));

      return { previousList, previousDetail, id };
    },
    onError: (error, _vars, context) => {
      if (context?.previousList) queryClient.setQueryData(filtersQueryKey, context.previousList);
      if (context?.previousDetail) queryClient.setQueryData(filterDetailQueryKey(context.id), context.previousDetail);
      reportFilterError(error);
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: filtersQueryKey });
      queryClient.invalidateQueries({ queryKey: filterDetailQueryKey(id) });
    },
  });
}

/** Marca o desmarca un filtro como favorito (bloque 2.12, requirement "Marcar y desmarcar un filtro como favorito"): mismo camino que `useUpdateFilter`, con su propio atajo por no llevar formulario. */
export function useToggleFilterFavorite() {
  const updateFilter = useUpdateFilter();
  return {
    ...updateFilter,
    mutate: (vars: { id: string; isFavorite: boolean }) =>
      updateFilter.mutate({ id: vars.id, patch: { is_favorite: vars.isFavorite } }),
  };
}

/** Elimina un filtro (bloque 2.12): no toca ninguna tarea, etiqueta ni proyecto que su consulta mostraba. */
export function useDeleteFilter() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: FILTERS_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("filters").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: filtersQueryKey });
      const previousList = listSnapshot(queryClient);
      queryClient.setQueryData<FilterRow[]>(filtersQueryKey, (old) => (old ?? []).filter((f) => f.id !== id));
      return { previousList };
    },
    onError: (error, _id, context) => {
      if (context?.previousList) queryClient.setQueryData(filtersQueryKey, context.previousList);
      reportFilterError(error);
    },
    onSuccess: () => toastSuccess("Filtro eliminado."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: filtersQueryKey }),
  });
}
