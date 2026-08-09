/**
 * El acorde `G` (bloque 7.3/7.4, D-G): 1,5 s de ventana para la segunda
 * tecla. `habitos` (`G A`) navega a `/habitos` desde la tarea 5.5 de la
 * fase 3, que construyó la pantalla.
 */
export const CHORD_TIMEOUT_MS = 1500;

/** La primera tecla del acorde (bloque 2, D-C): el indicador de atajo la lee de acá en vez de repetirla como cadena escrita a mano. */
export const CHORD_TRIGGER_KEY = "g";

export type ChordDestination = "bandeja" | "hoy" | "proximos" | "etiquetas" | "completado" | "habitos" | "filtros";

/** `f` (`filtros-alcanzables`, tarea 1.2): libre, ninguna de las seis teclas ya usadas (`i`, `h`, `p`, `e`, `c`, `a`) la ocupa, verificado contra `openspec/specs/atajos-de-teclado/spec.md`. */
const CHORD_MAP: Record<string, ChordDestination> = {
  i: "bandeja",
  h: "hoy",
  p: "proximos",
  e: "etiquetas",
  c: "completado",
  a: "habitos",
  f: "filtros",
};

/** Inverso de `CHORD_MAP`, no un duplicado escrito a mano: la segunda tecla que efectivamente navega a cada destino, para que el indicador de atajo (bloque 2, D-C) muestre siempre la que está realmente registrada. */
export const CHORD_KEY_BY_DESTINATION: Record<ChordDestination, string> = Object.fromEntries(
  Object.entries(CHORD_MAP).map(([key, destination]) => [destination, key]),
) as Record<ChordDestination, string>;

/** Ruta de cada destino del acorde. */
export const CHORD_ROUTES: Record<ChordDestination, string | null> = {
  bandeja: "/bandeja",
  hoy: "/hoy",
  proximos: "/proximos",
  etiquetas: "/etiquetas",
  completado: "/completado",
  habitos: "/habitos",
  filtros: "/filtros",
};

/** La segunda tecla del acorde, o `null` si no es ninguna de las reconocidas (`G` seguido de cualquier otra tecla cancela el acorde sin disparar nada, requirement "Una tecla ajena al acorde lo cancela"). */
export function chordDestinationFor(key: string): ChordDestination | null {
  return CHORD_MAP[key.toLowerCase()] ?? null;
}
