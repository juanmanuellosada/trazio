-- Reescribe una sola vez las preferencias de Bandeja y Proyecto que tengan
-- "nada" guardado explícitamente en `groupBy`, pasándolas a "sección"
-- (D-B, `openspec/changes/lista-con-mas-agrupadores/design.md`): esas filas
-- se guardaron cuando "nada" significaba agrupar por sección en esas dos
-- pantallas. Sin esto, "nada" pasa a significar lista corrida y quien la
-- tenga guardada vería su proyecto aplanado sin haberlo pedido.
--
-- No se resuelve traduciendo el valor al leer (D-B): eso dejaría la lista
-- corrida inalcanzable para siempre en un proyecto, que es justo la
-- capacidad que se agrega.
--
-- No toca las filas de etiqueta, filtro, hoy ni próximos (`view_key`
-- distinto de 'bandeja' y de 'proyecto:%'): ahí "nada" ya significaba lista
-- corrida antes de este cambio, así que no hay nada que migrar.
--
-- Idempotente: una segunda corrida no encuentra ninguna fila con
-- `groupBy = 'nada'` bajo esas claves (ya quedaron en 'seccion'), así que no
-- hace nada.
update public.view_preferences
set options = jsonb_set(options, '{groupBy}', '"seccion"')
where (view_key = 'bandeja' or view_key like 'proyecto:%')
  and options ->> 'groupBy' = 'nada';
