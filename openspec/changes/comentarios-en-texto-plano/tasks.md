> **Cómo se ejecutan estas tandas.** El grupo 1 es bloqueante y hay que hacerlo con la
> cabeza fría: **convierte datos y se pierde formato de forma irreversible**. El grupo 2
> es la interfaz. El grupo 3 son los registros escritos, que en este cambio no son
> trámite: hay una decisión que enmendar.
>
> **Este cambio revierte una decisión.** No es un arreglo: el código de hoy cumple el
> spec, cumple D2 y cumple `product-spec.md`. Si al implementarlo algo parece un bug,
> probablemente sea el comportamiento correcto de antes.

## 1. Los datos (bloqueante, e irreversible)

- [ ] 1.1 **Antes de escribir nada, contar cuántos comentarios hay y mirar su contenido.** Es una base de un solo usuario: la consulta es barata y decide cuánto esfuerzo merece el aplanado
- [ ] 1.2 Si aparece algún comentario con formato que valga la pena, **parar y avisar** antes de convertirlo. Una vez migrado no hay vuelta
- [ ] 1.3 Migración: `comments.content` pasa de `jsonb` a texto (decisión **D-B**)
- [ ] 1.4 El aplanado preserva el texto y **los saltos de línea entre bloques**. Un documento de tres párrafos no puede quedar como una línea corrida
- [ ] 1.5 Probar la migración **contra una copia con los datos reales**, no solo con una tabla vacía: el caso que importa es el documento que ya existe
- [ ] 1.6 No tocar la política de RLS de la tabla, que ya existe y no cambia
- [ ] 1.7 Regenerar los tipos con `pnpm db:types:local`, **nunca contra el remoto**

## 2. La interfaz

- [ ] 2.1 `components/comments/comment-composer.tsx`: campo de texto en vez de `TaskDescriptionEditor`
- [ ] 2.2 `components/comments/comment-item.tsx`: lo mismo para editar un comentario existente
- [ ] 2.3 `components/comments/comment-content.tsx`: renderizar texto en vez de instanciar un editor de solo lectura. **Respetar los saltos de línea**
- [ ] 2.4 Ese archivo duplica un bloque de ~25 clases copiado del editor de descripción: se va con el cambio
- [ ] 2.5 Revisar qué quedó huérfano al dejar de importar el editor desde comentarios. **La descripción lo sigue usando: no se borra nada de Tiptap**
- [ ] 2.6 Comprobar que escribir sintaxis de markdown en un comentario **no** la convierte: queda como los caracteres escritos
- [ ] 2.7 Actualizar los tests de comentarios, que hoy asumen el editor enriquecido

## 3. Los registros escritos

- [ ] 3.1 **Enmendar D2.** Decide dos cosas: que el título es texto plano —vigente— y que la descripción y los comentarios son enriquecidos —superado solo en comentarios—. La decisión nueva tiene que decir **explícitamente qué parte supera y qué parte sigue en pie**
- [ ] 3.2 El registro **no se reescribe**: se agrega la decisión nueva al final con el número que siga, y a D2 la referencia cruzada. Leer varias decisiones antes de escribir, para el tono
- [ ] 3.3 Dejar escrito en la decisión nueva **por qué la asimetría con la descripción es intencional** (**D-C**). El impulso de unificar los dos editores va a volver
- [ ] 3.4 `docs/product-spec.md`: la tabla de atributos describe los comentarios como texto enriquecido

## 4. Verificación

- [ ] 4.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 4.2 Escribir, editar y borrar un comentario, en el navegador
- [ ] 4.3 Un comentario de varios párrafos **se lee con sus saltos de línea**
- [ ] 4.4 **Un comentario escrito antes del cambio se sigue leyendo**, con su texto entero
- [ ] 4.5 La descripción de la tarea sigue enriquecida y con su barra de herramientas
- [ ] 4.6 En escritorio y en 390px
