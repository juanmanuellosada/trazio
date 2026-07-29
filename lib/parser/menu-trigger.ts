/**
 * Detección del menú de `#`/`@` (bloque 3, A3 del design): el menú es
 * funcionalidad nueva, distinta del reconocimiento que ya hace el parser —
 * acá solo se decide **si** hay que mostrarlo y con qué texto filtrar, nunca
 * se resuelve el token (eso lo sigue haciendo `recognizers.ts` cuando el
 * título se vuelve a parsear). Función pura sobre el texto y la posición del
 * cursor, sin estado: así se puede testear sin montar el componente.
 */
export type MenuTrigger = {
  symbol: "#" | "@";
  /** Índice del símbolo (`#` o `@`) en el texto. */
  start: number;
  /** Lo escrito entre el símbolo y el cursor. */
  query: string;
};

/**
 * Busca hacia atrás desde el cursor el borde del token actual (espacio, otro
 * `#`/`@`, o el principio del texto). Si el carácter justo antes de ese borde
 * es `#` o `@`, el cursor está escribiendo ese token — mismo criterio de
 * borde que usa `LABEL_RE` en `recognizers.ts` (`[^\s#@]+`). Escribir un
 * espacio o un segundo símbolo corta el token y cierra el menú, como pide el
 * escenario "Seguir escribiendo fuera del token cierra el menú".
 */
export function findMenuTrigger(text: string, cursor: number): MenuTrigger | null {
  let i = cursor;
  while (i > 0 && !/[\s#@]/.test(text[i - 1])) i--;
  if (i === 0) return null;
  const symbol = text[i - 1];
  if (symbol !== "#" && symbol !== "@") return null;
  return { symbol, start: i - 1, query: text.slice(i, cursor) };
}
