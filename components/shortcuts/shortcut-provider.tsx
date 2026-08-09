"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CHORD_ROUTES, CHORD_TIMEOUT_MS, CHORD_TRIGGER_KEY, chordDestinationFor } from "@/lib/shortcuts/chord";
import { ShortcutRegistryContext } from "@/lib/shortcuts/context";
import { GENERAL_SHORTCUTS } from "@/lib/shortcuts/general";
import { isBlockedByFocusGuard } from "@/lib/shortcuts/guards";
import { matchesCombo } from "@/lib/shortcuts/match";
import type { ShortcutScope } from "@/lib/shortcuts/types";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { defaultEventRange } from "@/lib/calendar/default-event-range";
import { CreateEventDialog } from "@/components/calendar/create-event-dialog";
import { SearchPalette } from "@/components/search/search-palette";
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
  // Precarga del alta rápida cuando la abrió una URL, no el botón ni `Q`
  // (`accesos-directos-y-compartir`): `null` en los otros dos disparadores.
  const [quickAddPrefill, setQuickAddPrefill] = useState<{ text: string; description: string | null } | null>(null);
  const [eventRange, setEventRange] = useState<{ start: Date; end: Date } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  /**
   * Cierra el diálogo y descarta la precarga (si la hubo), para que abrirlo
   * de nuevo con `Q` o el botón del panel lateral no arrastre el texto de
   * una URL anterior.
   */
  const handleQuickAddOpenChange = useCallback((open: boolean) => {
    setQuickAddOpen(open);
    if (!open) setQuickAddPrefill(null);
  }, []);

  /**
   * "Nueva tarea" y el destino de compartir del manifest (`app/manifest.ts`,
   * `app/compartir/route.ts`) no tienen una pantalla propia que abrir por
   * URL (D-C del design): en vez de eso llegan como `?agregar=1` o
   * `?compartido=…` sobre una pantalla que ya existe, y este único punto —
   * el mismo que ya monta el diálogo global para el botón y `Q` — los lee
   * al montar y abre el diálogo con ese texto puesto. `window.location`
   * directo, no `useSearchParams`: el disparador siempre es una navegación
   * dura (acceso directo del ícono, intent de compartir), así que alcanza
   * con leerlo una vez al montar, sin la exigencia de un límite de
   * `Suspense` que pediría el hook de Next para lo mismo.
   *
   * Sin crear nada acá (D-A): solo abre el diálogo con el texto — la tarea
   * se confirma a mano como cualquier alta.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const agregar = params.get("agregar");
    const compartido = params.get("compartido");
    if (agregar === null && compartido === null) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con la URL de entrada (sistema externo: acceso directo del ícono o intent de compartir), no deriva estado de un render
    setQuickAddPrefill(compartido !== null ? { text: compartido, description: params.get("descripcion") } : null);
    setQuickAddOpen(true);

    // Limpia los parámetros usados para que un refresh o "atrás" no vuelva a
    // abrir el alta con el mismo texto.
    params.delete("agregar");
    params.delete("compartido");
    params.delete("descripcion");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, []);

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
      if (matchesCombo(event, GENERAL_SHORTCUTS.buscar)) {
        // `buscador-como-paleta`, D-A: `S` abre la paleta por encima de la
        // vista actual, en vez de navegar a `/buscar` y perderla. El
        // requisito de atajos ya decía "abrir el buscador", no "navegar".
        setSearchOpen(true);
        return true;
      }
      if (matchesCombo(event, GENERAL_SHORTCUTS.agregarTarea)) {
        setQuickAddOpen(true);
        return true;
      }
      if (matchesCombo(event, GENERAL_SHORTCUTS.agregarEvento)) {
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

      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === CHORD_TRIGGER_KEY) {
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
      <GlobalQuickAddDialog
        open={quickAddOpen}
        onOpenChange={handleQuickAddOpenChange}
        inboxProjectId={inboxProjectId}
        initialPrefill={quickAddPrefill}
      />
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
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
