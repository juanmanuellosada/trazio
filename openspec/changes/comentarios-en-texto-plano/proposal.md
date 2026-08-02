## Why

Los comentarios de una tarea usan hoy **el mismo editor Tiptap enriquecido que la
descripción**: barra de herramientas, títulos, tablas, listas de tareas, bloques de
código, notas al pie. No es un parecido, es el mismo componente importado.

El dueño, usándolo, decidió que no los quiere así: un comentario es una nota corta al
margen de una tarea, y darle el mismo peso editorial que a la descripción es
desproporcionado. La barra de formato ocupa más que lo que se suele escribir.

Esto **contradice tres cosas escritas y alineadas entre sí**, y por eso va como cambio
de decisión y no como arreglo:

- `openspec/specs/comentarios/spec.md` lo exige explícitamente.
- **D2** de `docs/decisions.md` dice, en la misma oración que descarta el markdown en el
  título: *"La descripción y los comentarios sí son enriquecidos."*
- `docs/product-spec.md` lo repite en la tabla de atributos.

El código cumple los tres. No hay nada roto: hay una decisión que se revisa.

## What Changes

**Un comentario se escribe y se muestra como texto plano**

- Se reemplaza el editor enriquecido por un campo de texto simple. Sin barra de
  herramientas, sin menú de insertar, sin diálogo de enlaces.
- Los saltos de línea se respetan al mostrarlo. Un comentario de varias líneas sigue
  leyéndose como varias líneas.
- **La descripción de la tarea no se toca.** Sigue siendo enriquecida, con todo lo que
  fijan D30 y D31. La distinción es justamente el punto: la descripción es el cuerpo de
  la tarea, el comentario es una nota al margen.

**Los comentarios ya escritos se conservan como texto**

- Lo guardado hoy es un documento estructurado. Se convierte a texto plano preservando
  el contenido y los saltos de línea, y **se pierde el formato**: negritas, títulos,
  tablas y listas quedan como el texto que contienen.
- Es una conversión de ida. Se hace en una migración, no al vuelo en la aplicación.

**Se enmienda D2**

- D2 afirma que los comentarios son enriquecidos. Como el registro de decisiones no se
  reescribe, se agrega una decisión nueva que la supera en esa parte, con la referencia
  cruzada en D2. Lo que D2 decide sobre el **título** sigue vigente y no se toca.

**BREAKING** en datos: el formato de los comentarios existentes se pierde de forma
irreversible.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `comentarios`: un comentario deja de escribirse con el editor Tiptap enriquecido y
  pasa a ser texto plano.

## Impact

**Código.** `components/comments/comment-composer.tsx` y `comment-item.tsx` dejan de
montar `TaskDescriptionEditor`; `comment-content.tsx` deja de instanciar un editor de
solo lectura y pasa a renderizar texto. Ese último duplica hoy un bloque de ~25 clases
de estilo copiado del editor de descripción, que desaparece con el cambio. Hay que
revisar si algo más del editor enriquecido queda huérfano al dejar de usarse desde
comentarios — la descripción lo sigue usando, así que **no** se borra.

**Datos.** `comments.content` es `jsonb`. Hay que decidir en el diseño si pasa a `text`
o si se conserva la columna con contenido plano, y escribir la migración de conversión.
Cualquiera de las dos exige aplanar los documentos existentes.

**Documentación.** `docs/product-spec.md` describe los comentarios como texto
enriquecido en la tabla de atributos. `docs/decisions.md` necesita la decisión nueva y
la referencia cruzada en D2.

**Dependencias.** Ninguna nueva. Tiptap y sus extensiones se siguen usando para la
descripción, así que no se desinstala nada.

**Fuera de alcance.** La descripción de la tarea. El veto a adjuntos en comentarios,
que sigue vigente y no se toca. El resto del hilo de comentarios —crear, editar,
borrar, orden— sigue igual.
