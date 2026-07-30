-- Backfill opcional de description_text para las tareas existentes con
-- descripción (jsonb de Tiptap): recorre recursivamente los nodos del
-- documento y concatena el texto de sus hojas. A partir de acá la
-- aplicación mantiene description_text sincronizada en cada guardado (ver
-- D-B de design.md); esto es un ajuste único sobre datos ya existentes, no
-- un mecanismo permanente de extracción.
with recursive nodes as (
  select id, jsonb_array_elements(description -> 'content') as node
  from public.tasks
  where description is not null and description_text is null
  union all
  select nodes.id, jsonb_array_elements(coalesce(nodes.node -> 'content', '[]'::jsonb)) as node
  from nodes
  where nodes.node ? 'content'
),
texts as (
  select id, string_agg(node ->> 'text', ' ') as description_text
  from nodes
  where node ? 'text'
  group by id
)
update public.tasks
set description_text = texts.description_text
from texts
where tasks.id = texts.id;
