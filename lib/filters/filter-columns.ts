/**
 * Fila de filtro guardado (capacidad `filtros-guardados`): la consulta se
 * guarda como texto crudo, nunca compilada (spec, requirement "Crear un
 * filtro guardado a partir de una consulta") — se vuelve a parsear en cada
 * ejecución. Módulo sin `"use client"`, mismo motivo que
 * `lib/tasks/task-columns.ts`: lo usan tanto los hooks del cliente como los
 * `get-*.ts` que siembran el caché desde el Server Component.
 */
export type FilterRow = {
  id: string;
  name: string;
  query: string;
  color: string;
  icon: string | null;
  is_favorite: boolean;
};

export const FILTER_COLUMNS = "id, name, query, color, icon, is_favorite";
