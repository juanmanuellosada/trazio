---
paths:
  - "supabase/**"
  - "lib/supabase/**"
---

# Reglas de base de datos

## RLS: innegociable

Toda tabla que contenga datos de usuario nace con:

1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` en la **misma migración** que la crea.
2. Una columna `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
3. Políticas de `select`, `insert`, `update` y `delete` basadas en
   `(select auth.uid()) = user_id`.

Usar `(select auth.uid())` y no `auth.uid()` a secas: envolverlo en un subselect
permite que Postgres lo evalúe una sola vez por query en lugar de por fila, lo cual
cambia el plan de ejecución en tablas grandes.

Nunca desactivar RLS "temporalmente para probar". Si una query no anda, el problema
es la política, no el RLS.

## Migraciones

- Una migración por cambio lógico, con nombre descriptivo.
- Nunca editar una migración ya aplicada. Se corrige con una nueva.
- Después de cada migración: `pnpm db:types` para regenerar los tipos.
- Índices: crear el índice junto con la columna que lo necesita, no después.
  Como mínimo, índice en `user_id` en cada tabla, y en las columnas por las que se
  filtra u ordena (`due_date`, `project_id`, `completed_at`).

## Claves

- La `service_role` key nunca sale del servidor. No va en variables `NEXT_PUBLIC_*`,
  no se pasa a un componente cliente, no se loguea.
- El cliente del navegador usa exclusivamente la clave publicable.

## Consultas

- Nada de `select('*')` en listas. Pedir las columnas que se usan.
- Cuidado con el N+1: traer tareas y después sus etiquetas de a una es el error
  clásico acá. Usar joins anidados de PostgREST.
- Paginación por rango en listas potencialmente largas (Completado, resultados de
  búsqueda).

## Borrado

- Proyecto eliminado: borra en cascada sus secciones y tareas. Es destructivo y
  requiere confirmación explícita en la interfaz, mostrando cuántas tareas se van
  a perder.
- Sección eliminada: sus tareas **no** se borran, quedan sin sección dentro del
  mismo proyecto.
- Etiqueta eliminada: se quita de todas las tareas que la tenían.
- La Bandeja de entrada no se puede borrar ni archivar. Protegerlo también a nivel
  base de datos, no solo en la interfaz.

## Fechas y zonas horarias

- Todo instante se guarda en UTC (`timestamptz`).
- La zona horaria del usuario vive en sus preferencias, en formato IANA.
- Las fechas sin hora (una tarea que vence "el martes", sin momento concreto) se
  guardan como `date`, no como `timestamptz`. Mezclarlas es la fuente número uno de
  bugs de "se me movió un día".
