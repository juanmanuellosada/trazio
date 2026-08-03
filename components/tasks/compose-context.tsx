"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Contexto de alta de la vista actual (`alta-de-tareas-en-contexto`, D-A):
 * proyecto y fecha por defecto de dónde está parado el usuario. Los montajes
 * que ya reciben este contexto por props (Bandeja, Hoy, Próximos, Proyecto,
 * cada sección) no lo consumen — siguen funcionando igual, su precedencia ya
 * está resuelta (D-A). Lo consume el diálogo global compartido (botón del
 * panel lateral y atajo `Q`, `components/shortcuts/global-quick-add-dialog.tsx`),
 * que hoy no tiene otra forma de saber dónde está parado el usuario.
 *
 * `sectionId` nunca se lee: el diálogo global no hereda sección (reporte del
 * dueño, 2026-08-03), solo proyecto. Se mantiene en el tipo por forma —
 * publicarlo en `null` es más simple que dos formas distintas de anunciar
 * el contexto de vista.
 *
 * Por D12 esto no es un store global: es contexto de React, publicado por la
 * vista montada y leído por el diálogo — mismo patrón que
 * `task-detail-context.tsx` resuelve para "qué tarea está abierta en el
 * detalle".
 */
export type ComposeContext = {
  projectId: string | null;
  sectionId: string | null;
  /** `yyyy-MM-dd`, o `null` en las vistas sin un día propio (todo salvo Hoy y Próximos). */
  defaultDueDate: string | null;
};

const EMPTY_CONTEXT: ComposeContext = { projectId: null, sectionId: null, defaultDueDate: null };

type ComposeContextValue = {
  context: ComposeContext;
  publish: (context: ComposeContext) => void;
};

const ComposeContextCtx = createContext<ComposeContextValue | null>(null);

export function ComposeContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<ComposeContext>(EMPTY_CONTEXT);
  const value = useMemo(() => ({ context, publish: setContext }), [context]);
  return <ComposeContextCtx.Provider value={value}>{children}</ComposeContextCtx.Provider>;
}

function useComposeContextValue(): ComposeContextValue {
  const ctx = useContext(ComposeContextCtx);
  if (!ctx) {
    throw new Error("useComposeContext se tiene que usar dentro de <ComposeContextProvider>.");
  }
  return ctx;
}

/** Lee el contexto de alta publicado por la vista actual (D-A): lo consume el diálogo global. */
export function useComposeContext(): ComposeContext {
  return useComposeContextValue().context;
}

/**
 * Publica el contexto de alta de la vista montada (D-A): cada vista lo llama
 * una vez con su proyecto, su sección (si tiene una fija) y su fecha por
 * defecto. Se vuelve a publicar solo cuando alguno de esos tres valores
 * cambia, nunca en cada render — no hace falta limpiar al desmontar: la
 * vista siguiente publica el suyo antes de que el usuario llegue a abrir un
 * diálogo global.
 */
export function usePublishComposeContext(context: ComposeContext): void {
  const { publish } = useComposeContextValue();
  useEffect(() => {
    publish(context);
    // Deps por campo, no por el objeto `context` (identidad nueva en cada
    // render de quien llama): así solo se re-publica cuando el destino
    // realmente cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publish, context.projectId, context.sectionId, context.defaultDueDate]);
}
