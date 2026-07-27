/**
 * Helpers de preparación compartidos por los tests de RLS. Sin ellos, una
 * llamada de preparación (crear un proyecto, una sección, una tarea) que
 * falla queda enmascarada: el `data` es `null`, pero el test sigue con un
 * `data!.algo` que revienta dos líneas después como un TypeError genérico
 * sobre `null` en vez de mostrar el error real de Postgres/PostgREST.
 *
 * Reciben `data` y `error` por separado (no el resultado envuelto): el tipo
 * de retorno real de PostgREST es una unión discriminada
 * (`{ data: T; error: null } | { data: null; error: PostgrestError }`), e
 * inferir `T` contra esa unión completa termina arrastrando `null` al tipo
 * devuelto. Desestructurar antes de llamar evita el problema.
 */

/** Para llamadas de preparación que devuelven una fila (`.single()`). */
export function unwrap<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error || data === null) {
    throw new Error(`${context}: ${error?.message ?? "sin datos"}`);
  }
  return data;
}

/** Para llamadas de preparación sin fila de retorno (insert/update sin `.select()`). */
export function assertOk(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}
