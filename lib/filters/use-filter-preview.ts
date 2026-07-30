"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { parseQuery } from "@/lib/query-language/parse";

export type FilterPreview =
  | { status: "vacio" }
  | { status: "error"; message: string }
  | { status: "cargando" }
  | { status: "listo"; count: number };

const DEBOUNCE_MS = 300;

/**
 * Vista previa en vivo del conteo de coincidencias de una consulta de filtro
 * (bloque 2.16, requirement "Vista previa en vivo del conteo de
 * coincidencias"): debounce de 300ms sobre lo que se escribe, y el error de
 * sintaxis se muestra al instante desde el parser local, sin esperar una
 * ida y vuelta al servidor que de todos modos fallaría con el mismo error.
 */
export function useFilterPreviewCount(query: string): FilterPreview {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = debounced.trim();
  const parsed = trimmed.length > 0 ? parseQuery(trimmed) : null;
  const astKey = parsed?.ok ? JSON.stringify(parsed.ast) : null;

  const { data, isFetching } = useQuery({
    queryKey: ["filters", "preview", astKey],
    queryFn: async () => {
      const supabase = createClient();
      const current = parsed;
      const { count, error } = await supabase.rpc(
        "buscar_tareas",
        { ast: current?.ok ? current.ast : {} },
        { count: "exact", head: true },
      );
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!parsed?.ok,
  });

  if (trimmed.length === 0) return { status: "vacio" };
  if (!parsed?.ok) return { status: "error", message: parsed!.error.message };
  if (isFetching || data === undefined) return { status: "cargando" };
  return { status: "listo", count: data };
}
