"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "@/lib/tasks/use-tasks";
import { parseQuery } from "@/lib/query-language/parse";
import type { AstNode } from "@/lib/query-language/ast";
import type { QueryParseError } from "@/lib/query-language/errors";
import { tokenize, type Token } from "@/lib/query-language/tokenize";
import { QUERY_FIELD_REFERENCE } from "@/lib/query-language/field-reference";

/** Requirement "El buscador requiere un mínimo de dos caracteres". */
const MIN_CHARS = 2;
/** Requirement "El buscador devuelve como máximo 50 resultados" — también en el modo consulta (tarea 1.2 de `buscador-con-lenguaje-de-consulta`). */
const MAX_RESULTS = 50;
const DEBOUNCE_MS = 250;

export type SearchClassification =
  | { mode: "texto" }
  | { mode: "consulta"; ast: AstNode }
  | { mode: "error"; error: QueryParseError };

/** Mismos campos que el resto del lenguaje de consulta — vía `field-reference.ts`, nunca una lista propia. */
const KNOWN_FIELDS = new Set<string>(QUERY_FIELD_REFERENCE.map((f) => f.field));

/**
 * Detecta un intento de consulta mirando el token que precede al primer
 * ":" (D-A de `openspec/changes/buscador-con-lenguaje-de-consulta/design.md`,
 * afinado tras revisión: "contiene ':'" alcanzaba para "label"/"due" sueltos,
 * pero también marcaba como intento de consulta texto perfectamente normal
 * como "14:30" o "nota: comprar"). Tokeniza solo hasta ese primer ":"
 * —reusando `tokenize()`, nunca reimplementando el lenguaje— y compara el
 * token anterior contra los campos conocidos: si es uno de ellos ("priority"
 * en "priority:9"), es un intento real de consulta y un error más adelante
 * en el parseo es un error de sintaxis real (D-B, nunca cae en silencio a
 * texto). Si no ("14" en "14:30", "nota" en "nota: comprar"), nunca hubo
 * intención de consulta: es texto, sin importar qué diga el resto de la
 * cadena.
 */
function looksLikeQuery(term: string): boolean {
  const colonIndex = term.indexOf(":");
  if (colonIndex === -1) return false;

  let tokens: Token[];
  try {
    tokens = tokenize(term.slice(0, colonIndex + 1));
  } catch {
    return false;
  }

  // tokenize() siempre agrega un EOF al final, así que el token justo antes
  // del COLON que acabamos de aislar es el tercero desde el final.
  const fieldToken = tokens[tokens.length - 3];
  return fieldToken?.type === "WORD" && KNOWN_FIELDS.has(fieldToken.value);
}

export function classifySearchTerm(term: string): SearchClassification {
  if (!looksLikeQuery(term)) return { mode: "texto" };
  const parsed = parseQuery(term);
  if (!parsed.ok) return { mode: "error", error: parsed.error };
  return { mode: "consulta", ast: parsed.ast };
}

export type SearchState =
  | { status: "corto" }
  | { status: "buscando" }
  | { status: "error"; error: QueryParseError }
  | { status: "listo"; tasks: TaskRow[]; mode: "texto" }
  | { status: "listo"; tasks: TaskRow[]; mode: "consulta"; query: string };

/**
 * Busca tareas por título y descripción (capacidad `buscador`, D-B de
 * design.md): mismo `search_vector` y misma configuración
 * `spanish_unaccent` que el campo `search:` del lenguaje de consulta —
 * "reunion" encuentra "reunión", "reuniones" también, y "renuion" (con
 * error de tipeo) no encuentra nada. Orden: pendientes primero
 * (`completed_at` nulo), después completadas por fecha de completado
 * (mismo criterio que `CompletedView`); dentro del grupo de pendientes, por
 * fecha de creación descendente, ya que el spec no fija qué fecha usar ahí.
 */
async function searchByText(term: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .textSearch("search_vector", term, { type: "plain", config: "spanish_unaccent" })
    .order("completed_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS);
  if (error) throw error;
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}

/**
 * Resuelve una consulta del lenguaje de filtros escrita en el buscador
 * (capacidad `buscador`, D-A de `buscador-con-lenguaje-de-consulta/design.md`):
 * mismo RPC `buscar_tareas` que ya llama `lib/filters/use-filter-results.ts`
 * para los filtros guardados, con el mismo tope de 50 que el modo texto.
 */
async function searchByQuery(ast: AstNode): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("buscar_tareas", { ast }).select(TASK_LIST_COLUMNS).limit(MAX_RESULTS);
  if (error) throw error;
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}

export function useSearch(term: string): SearchState {
  const [debounced, setDebounced] = useState(term);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const trimmed = debounced.trim();
  const enabled = trimmed.length >= MIN_CHARS;
  const classification = enabled ? classifySearchTerm(trimmed) : { mode: "texto" as const };

  const { data, isFetching } = useQuery({
    queryKey:
      classification.mode === "consulta"
        ? ["search", "consulta", JSON.stringify(classification.ast)]
        : ["search", "texto", trimmed],
    queryFn: () => (classification.mode === "consulta" ? searchByQuery(classification.ast) : searchByText(trimmed)),
    enabled: enabled && classification.mode !== "error",
  });

  if (!enabled) return { status: "corto" };
  if (classification.mode === "error") return { status: "error", error: classification.error };
  if (isFetching || data === undefined) return { status: "buscando" };
  if (classification.mode === "consulta") return { status: "listo", tasks: data, mode: "consulta", query: trimmed };
  return { status: "listo", tasks: data, mode: "texto" };
}
