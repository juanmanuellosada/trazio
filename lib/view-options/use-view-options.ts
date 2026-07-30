"use client";

import { defaultOptionsForViewKey, type QuickFilters, type ViewOptions } from "./schema";
import { useUpdateViewOptions } from "./mutations";
import { useViewPreferences } from "./use-view-preferences";

/**
 * Opciones de vista de una pantalla, listas para leer y para cambiar
 * (bloque 6.2/6.3): junta la lectura (`useViewPreferences`, con
 * `initialOptions` sembrado por el Server Component) y la mutación
 * (`useUpdateViewOptions`) en un único hook. Tanto `ViewOptionsBar` como la
 * vista que la monta llaman a este mismo hook por separado — comparten
 * caché por la misma `queryKey` (mismo patrón que `useTasks`, llamado
 * independientemente desde `TaskList` y `SectionedTasks`), así que no hace
 * falta pasar las opciones por props.
 */
export function useViewOptions(viewKey: string, initialOptions: ViewOptions) {
  const { data } = useViewPreferences(viewKey, initialOptions);
  const update = useUpdateViewOptions(viewKey);
  const options = data ?? initialOptions;

  function setOption<K extends keyof ViewOptions>(key: K, value: ViewOptions[K]) {
    update.mutate({ [key]: value } as Partial<ViewOptions>);
  }

  function setQuickFilters(patch: Partial<QuickFilters>) {
    update.mutate({ quickFilters: { ...options.quickFilters, ...patch } });
  }

  function reset() {
    update.mutate(defaultOptionsForViewKey(viewKey));
  }

  return { options, setOption, setQuickFilters, reset };
}
