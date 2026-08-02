-- Revierte D2 para comentarios (ver la decisión nueva en docs/decisions.md
-- y openspec/changes/comentarios-en-texto-plano/): un comentario deja de
-- guardarse como un documento de Tiptap y pasa a ser texto plano. La
-- descripción de la tarea no se toca, sigue en jsonb.
--
-- Aplanado: función temporal que recorre el documento de Tiptap y concatena
-- el texto de sus nodos. Los nodos de texto (`text`) se concatenan sin
-- separador (son corridas de texto de un mismo bloque); `hardBreak` se
-- traduce a un salto de línea; cualquier otro nodo con hijos (párrafos,
-- encabezados, listas, celdas de tabla, etc.) los une con un salto de
-- línea, así los bloques no quedan pegados en una sola línea. Nodos sin
-- texto ni hijos (`horizontalRule`, `footnoteReference`) aportan cadena
-- vacía: es una conversión de ida, se pierde el formato a propósito.
create or replace function public.__migracion_tiptap_flatten(node jsonb)
returns text
language plpgsql
immutable
as $$
declare
  node_type text := node ->> 'type';
  children jsonb := node -> 'content';
  first_child_type text;
  separator text;
  parts text[] := '{}';
  child jsonb;
begin
  if node ? 'text' then
    return node ->> 'text';
  end if;

  if node_type = 'hardBreak' then
    return E'\n';
  end if;

  if children is null or jsonb_typeof(children) <> 'array' or jsonb_array_length(children) = 0 then
    return '';
  end if;

  first_child_type := (children -> 0) ->> 'type';
  separator := case when first_child_type in ('text', 'hardBreak') then '' else E'\n' end;

  for child in select * from jsonb_array_elements(children) loop
    parts := array_append(parts, public.__migracion_tiptap_flatten(child));
  end loop;

  return array_to_string(parts, separator);
end;
$$;

alter table public.comments
  alter column content type text using public.__migracion_tiptap_flatten(content);

drop function public.__migracion_tiptap_flatten(jsonb);
