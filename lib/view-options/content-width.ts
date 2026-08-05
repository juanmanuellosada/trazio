import type { ViewShape } from "./schema";

/**
 * Formas de ver sin tope de ancho propio (D-E, excepción acotada a D39):
 * un tablero o una grilla de calendario no son una línea de texto, ocupan
 * el ancho disponible. Las demás formas se centran en la columna de
 * contenido.
 *
 * Antes de esta tanda (`calendario-legible-y-manipulable`, grupo 8) la
 * misma excepción vivía escrita tres veces, una por pantalla
 * (`sectioned-tasks.tsx`, `hoy-view.tsx`, `proximos-view.tsx`), con el
 * mismo comentario — sumar el calendario como cuarta copia pedía
 * unificarla primero.
 */
const FULL_WIDTH_VIEW_SHAPES: ReadonlySet<ViewShape> = new Set(["panel", "calendario"]);

export function contentWidthClass(viewShape: ViewShape): string {
  return FULL_WIDTH_VIEW_SHAPES.has(viewShape) ? "w-full" : "w-full max-w-content mx-auto";
}
