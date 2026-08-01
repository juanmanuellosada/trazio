/**
 * El acorde `G` (bloque 7.3/7.4, D-G): 1,5 s de ventana para la segunda
 * tecla. `habitos` (`G A`) navega a `/habitos` desde la tarea 5.5 de la
 * fase 3, que construyó la pantalla.
 */
export const CHORD_TIMEOUT_MS = 1500;

export type ChordDestination = "bandeja" | "hoy" | "proximos" | "completado" | "habitos";

const CHORD_MAP: Record<string, ChordDestination> = {
  i: "bandeja",
  h: "hoy",
  p: "proximos",
  c: "completado",
  a: "habitos",
};

/** Ruta de cada destino del acorde. */
export const CHORD_ROUTES: Record<ChordDestination, string | null> = {
  bandeja: "/bandeja",
  hoy: "/hoy",
  proximos: "/proximos",
  completado: "/completado",
  habitos: "/habitos",
};

/** La segunda tecla del acorde, o `null` si no es ninguna de las reconocidas (`G` seguido de cualquier otra tecla cancela el acorde sin disparar nada, requirement "Una tecla ajena al acorde lo cancela"). */
export function chordDestinationFor(key: string): ChordDestination | null {
  return CHORD_MAP[key.toLowerCase()] ?? null;
}
