/**
 * El acorde `G` (bloque 7.3/7.4, D-G): 1,5 s de ventana para la segunda
 * tecla. `habitos` (`G A`) no navega a ningún lado en esta fase (bloque
 * 7.5, fase 3) — se reconoce igual que el resto para no romper el acorde,
 * pero su destino queda en `null` a propósito.
 */
export const CHORD_TIMEOUT_MS = 1500;

export type ChordDestination = "bandeja" | "hoy" | "proximos" | "completado" | "habitos";

const CHORD_MAP: Record<string, ChordDestination> = {
  i: "bandeja",
  t: "hoy",
  u: "proximos",
  c: "completado",
  a: "habitos",
};

/** Ruta de cada destino del acorde. `habitos` no tiene pantalla todavía (fase 3): `null` a propósito, nunca un `router.push` fantasma. */
export const CHORD_ROUTES: Record<ChordDestination, string | null> = {
  bandeja: "/bandeja",
  hoy: "/hoy",
  proximos: "/proximos",
  completado: "/completado",
  habitos: null,
};

/** La segunda tecla del acorde, o `null` si no es ninguna de las reconocidas (`G` seguido de cualquier otra tecla cancela el acorde sin disparar nada, requirement "Una tecla ajena al acorde lo cancela"). */
export function chordDestinationFor(key: string): ChordDestination | null {
  return CHORD_MAP[key.toLowerCase()] ?? null;
}
