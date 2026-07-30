/**
 * Errores del lenguaje de consulta (bloque 2.3, D-A de design.md): siempre
 * en español, siempre con la posición (índice de carácter) y la longitud
 * del fragmento problemático, nunca un mensaje genérico. `tokenize.ts` y
 * `parse.ts` son los únicos que la lanzan; `parseQuery` (en `parse.ts`) la
 * atrapa y la convierte en el resultado público `{ ok: false, error }`.
 */
export class QueryLanguageError extends Error {
  readonly position: number;
  readonly length: number;

  constructor(message: string, position: number, length: number) {
    super(message);
    this.name = "QueryLanguageError";
    this.position = position;
    this.length = length;
  }
}

export type QueryParseError = {
  message: string;
  position: number;
  length: number;
};

export function toQueryParseError(error: QueryLanguageError): QueryParseError {
  return { message: error.message, position: error.position, length: error.length };
}
