## Context

`components/comments/` monta hoy el editor de la descripción en tres lugares: el
composer, la edición de un comentario existente, y la vista de solo lectura, que
instancia un editor no editable con las mismas extensiones y duplica a mano un bloque
grande de clases de estilo copiado de `task-description-editor.tsx`.

El contenido se guarda como `jsonb` en `comments.content` — un documento de Tiptap.

Tres fuentes escritas y alineadas dicen que esto es lo correcto: el spec de
`comentarios`, **D2** de `docs/decisions.md` y la tabla de atributos de
`docs/product-spec.md`. El código las cumple. Esta propuesta revierte esa decisión para
comentarios, y solo para comentarios.

Restricciones que condicionan: **D30** (sin fórmula matemática) y **D31** (las
extensiones fijadas) siguen rigiendo la descripción; el veto a adjuntos en comentarios
sigue vigente.

## Goals / Non-Goals

**Goals:**

- Que escribir un comentario sea escribir, sin una barra de formato que ocupa más que
  lo que se escribe.
- Que lo ya escrito siga siendo legible.
- Que la descripción no se vea afectada.

**Non-Goals:**

- Tocar la descripción de la tarea.
- Sacar Tiptap del proyecto: la descripción lo sigue usando.
- Cambiar nada más del hilo: crear, editar, borrar y ordenar siguen igual.
- Levantar el veto a adjuntos en comentarios.

## Decisions

### D-A. Texto plano de verdad, no un editor enriquecido capado

Se reemplaza el editor por un campo de texto. No se conserva el editor con las
extensiones desactivadas.

Capar el editor dejaría el peso de Tiptap en una superficie que no lo necesita, y
seguiría guardando un documento estructurado con un solo tipo de nodo — la complejidad
sin el beneficio. Un comentario es una nota al margen; el componente tiene que decir
eso.

**Los saltos de línea se respetan al mostrar.** Sin eso, un comentario de tres párrafos
se ve como un bloque corrido y "texto plano" se convierte en una degradación en vez de
una simplificación.

### D-B. La columna pasa a texto

`comments.content` es `jsonb`. Pasa a ser texto.

*Alternativa descartada:* dejar la columna `jsonb` y guardar adentro un documento
mínimo. Evitaría la migración de esquema, pero deja el modelo mintiendo sobre lo que
guarda y obliga a serializar y deserializar para nada. El costo de la migración se paga
una vez.

La conversión aplana el documento existente preservando el texto y los saltos de línea
entre bloques. **El formato se pierde**: lo que era un título queda como su texto, una
lista como sus ítems en líneas separadas, una tabla como el texto de sus celdas. Es
irreversible.

Hay que **mirar cuántos comentarios hay realmente antes de escribir la migración**. Si
son pocos, un aplanado simple alcanza; si hay contenido complejo, conviene revisar caso
por caso antes de tirar el formato. Es una base de un solo usuario: la respuesta es
barata de conseguir y cambia cuánto esfuerzo merece el aplanado.

La migración va en la misma dirección que el resto del proyecto: **la política de RLS de
la tabla no se toca**, porque la tabla ya existe con la suya.

### D-C. La descripción no se toca, y esa asimetría es el punto

Queda una asimetría deliberada: la descripción es enriquecida y el comentario no.

No es una inconsistencia a resolver más adelante. La descripción es el cuerpo de la
tarea —donde va un procedimiento, una lista de pasos, una tabla— y el comentario es una
nota al margen. Que se vean distintos es información, no ruido.

Conviene dejarlo escrito en la decisión nueva, porque el impulso de "unificar" va a
volver.

### D-D. D2 se enmienda por referencia cruzada, no se edita

`docs/decisions.md` es un registro que **no se reescribe**: cuando una decisión queda
superada se le agrega una referencia cruzada a la nueva.

D2 decide dos cosas en el mismo texto: que el título es texto plano —vigente, no se
toca— y que la descripción y los comentarios son enriquecidos —superado en la parte de
comentarios—. La decisión nueva tiene que ser explícita sobre **qué parte de D2 supera y
qué parte sigue en pie**, o la próxima lectura de D2 va a quedar sin saber cuál de las
dos afirmaciones vale.

## Risks / Trade-offs

**Se pierde formato ya escrito, sin vuelta atrás** → Es el costo real y hay que
asumirlo con los ojos abiertos. Mitigación: mirar el contenido existente antes de
migrar. Si aparece un comentario con formato que valga la pena, el dueño decide si lo
reescribe a mano antes.

**Alguien va a querer volver a unificar los dos editores** → Por eso D-C queda escrito.
La asimetría es intencional.

**El bloque de estilos duplicado desaparece de comentarios pero sigue en descripción** →
No es deuda nueva; era duplicación que ya estaba. Al sacar una de las dos copias deja de
ser duplicación y pasa a ser el único lugar donde vive. Mejora sola.

## Open Questions

- Cuántos comentarios hay hoy y si alguno tiene formato que valga la pena preservar.
  Se responde con una consulta antes de escribir la migración, no antes de aprobar la
  propuesta.
