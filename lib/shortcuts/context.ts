"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { ShortcutBinding, ShortcutScope } from "./types";

export type ShortcutRegistry = {
  /** Empuja un contexto a la pila (bloque 7.1) y devuelve la función para sacarlo. El más recientemente empujado es el más específico: gana sobre cualquiera de abajo (requirement "Resolución de colisiones por contexto"). */
  pushScope: (scope: ShortcutScope) => () => void;
};

const NOOP_REGISTRY: ShortcutRegistry = {
  pushScope: () => () => {},
};

export const ShortcutRegistryContext = createContext<ShortcutRegistry>(NOOP_REGISTRY);

/**
 * Registra un contexto de atajos mientras el componente que lo llama está
 * montado (una pantalla, el detalle de una tarea, un menú contextual
 * abierto): sin `<ShortcutProvider>` de por medio, degrada en silencio
 * (mismo criterio que `useUndoStack` sin `<UndoProvider>`) para no romper
 * los tests de componente que no montan el árbol completo.
 *
 * `bindings` puede cambiar en cada render (se guarda en un `ref`, no
 * dispara un nuevo `push`): el orden de la pila lo fija el momento en que
 * el componente se monta, no cada actualización de sus bindings.
 * `enabled: false` saca el contexto de la pila sin desmontar el componente
 * (ej. un menú contextual que abre y cierra sin remontar `TaskRow`).
 */
export function useShortcutScope(bindings: ShortcutBinding[], options?: { enabled?: boolean }): void {
  const { pushScope } = useContext(ShortcutRegistryContext);
  const scopeRef = useRef<ShortcutScope>({ current: bindings });
  const enabled = options?.enabled ?? true;

  // Mantiene los bindings al día en cada render, sin volver a empujar el
  // contexto a la pila (eso solo pasa al montar/desmontar, más abajo): leer
  // o escribir `.current` tiene que pasar por un efecto, nunca durante el
  // render (regla de hooks de React 19).
  useEffect(() => {
    scopeRef.current.current = bindings;
  });

  useEffect(() => {
    if (!enabled) return;
    return pushScope(scopeRef.current);
  }, [enabled, pushScope]);
}
