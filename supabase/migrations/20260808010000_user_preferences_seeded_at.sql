-- Marca de contenido de ejemplo sembrado (openspec/changes/onboarding-con-ejemplos,
-- D-B/D-C): `seeded_at` no nulo significa "esta cuenta ya recibió (o nunca va a
-- recibir) su contenido de ejemplo". El sembrado la reclama de forma atómica con
--   update ... set seeded_at = now() where user_id = $1 and seeded_at is null
--   returning user_id
-- antes de crear nada (D-B): quien se queda con la fila devuelta siembra, la otra
-- ejecución concurrente (dos pestañas a la vez) no hace nada.
--
-- El backfill va en este mismo archivo, no en un paso aparte, porque es lo que
-- hace o rompe la función entera: la columna nace nullable, y el sembrado se
-- dispara exactamente cuando encuentra `seeded_at is null`. Si una migración
-- separada (o un script manual, "para después") fuera a marcar las cuentas
-- existentes, cualquier ventana entre agregar la columna y correr ese script deja
-- a cada cuenta ya existente con `seeded_at` nulo — y su próxima entrada le
-- sembraría un proyecto de ejemplo, con tareas y hábito de verdad, encima de sus
-- datos reales. No hay forma de deshacer eso sin que la persona dueña de la
-- cuenta lo note. Por eso el `update` de backfill corre en la misma transacción
-- implícita que agrega la columna (la que envuelve a todo este archivo): no
-- existe ningún instante en el que una cuenta anterior a esta migración tenga la
-- columna en null.
alter table public.user_preferences
  add column seeded_at timestamptz;

update public.user_preferences
set seeded_at = now()
where seeded_at is null;
