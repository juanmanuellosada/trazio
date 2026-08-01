"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CHORD_ROUTES, CHORD_TIMEOUT_MS, chordDestinationFor } from "@/lib/shortcuts/chord";
import { ShortcutRegistryContext } from "@/lib/shortcuts/context";
import { isBlockedByFocusGuard } from "@/lib/shortcuts/guards";
import { matchesCombo } from "@/lib/shortcuts/match";
import type { ShortcutScope } from "@/lib/shortcuts/types";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { defaultEventRange } from "@/lib/calendar/default-event-range";
import { CreateEventDialog } from "@/components/calendar/create-event-dialog";
import { GlobalQuickAddDialog } from "./global-quick-add-dialog";

/**
 * Único listener de atajos de la aplicación (bloque 7.1, D-G): un solo
 * `addEventListener("keydown", …, true)` en la raíz, con una pila de
 * contextos (`lib/shortcuts/context.ts`) donde el más recientemente
 * registrado gana. Acá viven, además, los atajos generales que no
 * pertenecen a ninguna pantalla en particular (bloque 7.4): el acorde `G`,
 * `S` (buscador), `Q` (alta rápida) y `E` (nuevo evento, bloque 7.5). La
 * colisión de `E` con la etiqueta del detalle de tarea
 * (`task-detail-content.tsx`) ya la resuelve la pila de contextos: cuando el
 * detalle está abierto empuja su propio binding de `E`, que gana acá abajo
 * sin que este componente sepa nada de tareas. `Ctrl/Cmd+Z` no pasa por acá:
 * sigue siendo el listener propio de `UndoProvider`, que no se toca (ver la
 * nota del bloque 7 en `tasks.md`).
 *
 * Vive una sola vez en `app/(app)/layout.tsx`, por encima de cualquier
 * pantalla — cada pantalla y cada modal registra su propio contexto con
 * `useShortcutScope` (bloque 7.1) en vez de un listener propio.
 */
export function ShortcutProvider({
  children,
  inboxProjectId,
}: {
  children: ReactNode;
  inboxProjectId: string | null;
}) {
  const router = useRouter();
  const { timezone } = useUserPreferences();
  const scopesRef = useRef<ShortcutScope[]>([]);
  const chordRef = useRef<{ pending: boolean; timer: ReturnType<typeof setTimeout> | null }>({
    pending: false,
    timer: null,
  });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [eventRange, setEventRange] = useState<{ start: Date; end: Date } | null>(null);

  const pushScope = useCallback((scope: ShortcutScope) => {
    scopesRef.current.push(scope);
    return () => {
      scopesRef.current = scopesRef.current.filter((s) => s !== scope);
    };
  }, []);

  useEffect(() => {
    function clearChord() {
      if (chordRef.current.timer) clearTimeout(chordRef.current.timer);
      chordRef.current.pending = false;
      chordRef.current.timer = null;
    }

    function startChord() {
      chordRef.current.pending = true;
      chordRef.current.timer = setTimeout(clearChord, CHORD_TIMEOUT_MS);
    }

    function resolveFromScopes(event: KeyboardEvent): boolean {
      // Del más específico (el último registrado) al más general
      // (requirement "Resolución de colisiones por contexto").
      for (let i = scopesRef.current.length - 1; i >= 0; i--) {
        const binding = scopesRef.current[i].current.find((b) => matchesCombo(event, b.combo));
        if (binding) {
          event.preventDefault();
          binding.handler(event);
          return true;
        }
      }
      return false;
    }

    /** Atajos generales (bloque 7.4): fallback cuando ninguna pantalla ni modal registró el mismo combo — la pila de arriba ya resuelve las colisiones de S y E (D-G). */
    function resolveGeneral(event: KeyboardEvent): boolean {
      if (matchesCombo(event, { key: "s" })) {
        router.push("/buscar");
        return true;
      }
      if (matchesCombo(event, { key: "q" })) {
        setQuickAddOpen(true);
        return true;
      }
      if (matchesCombo(event, { key: "e" })) {
        setEventRange(defaultEventRange(new Date()));
        return true;
      }
      return false;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isBlockedByFocusGuard(event)) return; // guarda de foco (bloque 7.2): solo teclas sueltas, no combos con Ctrl/Cmd

      if (chordRef.current.pending) {
        clearChord();
        if (event.key === "Escape") return; // cancela en silencio (requirement)
        const destination = chordDestinationFor(event.key);
        if (!destination) return; // tecla ajena: cancela sin disparar su propio atajo (requirement)
        event.preventDefault();
        const route = CHORD_ROUTES[destination];
        if (route) router.push(route);
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        startChord();
        return;
      }

      if (resolveFromScopes(event)) return;
      if (resolveGeneral(event)) event.preventDefault();
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      clearChord();
    };
  }, [router]);

  return (
    <ShortcutRegistryContext.Provider value={{ pushScope }}>
      {children}
      <GlobalQuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} inboxProjectId={inboxProjectId} />
      {eventRange && (
        <CreateEventDialog
          open
          onOpenChange={(open) => !open && setEventRange(null)}
          start={eventRange.start}
          end={eventRange.end}
          timezone={timezone}
        />
      )}
    </ShortcutRegistryContext.Provider>
  );
}
