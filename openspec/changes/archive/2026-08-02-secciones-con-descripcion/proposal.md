## Why

El dueño lo pidió así: *"las secciones tienen que ocupar más ancho, el ancho completo, y
tener descripción"*.

Son dos cosas de tamaño muy distinto y conviene no confundirlas:

**El ancho ya está disponible y lo tapa una sola clase.** La lista de secciones ya usa
`w-full max-w-content mx-auto` desde D39, así que la columna entera está a disposición.
Lo que limita el formulario de alta es un `max-w-64` suelto —256px— en el campo de
nombre. No es un problema de layout: es una clase que quedó.

**La descripción no existe.** La tabla `sections` tiene `id`, `user_id`, `project_id`,
`name`, `position` e `is_collapsed`, y nada más. El spec tampoco la promete: dice que una
sección se crea *"con nombre"*. `projects` sí tiene `description`, así que la asimetría
es entre proyectos y secciones, no entre spec y código.

Además, el alta de sección hoy no es un formulario: es un botón que se reemplaza por un
único campo que guarda al `Enter` o al perder el foco, sin botones de confirmar ni de
cancelar. Con dos campos eso deja de alcanzar — hay que poder pasar de nombre a
descripción sin que se guarde por el camino.

## What Changes

**Una sección tiene descripción**

- Columna nueva `description` en `sections`, de texto y opcional, igual que la de
  `projects`.
- Se puede escribir al crear la sección y editar después.
- Se muestra debajo del nombre en el encabezado de la sección.

**El alta de sección pasa a ser un formulario de ancho completo**

- Dos campos, nombre y descripción, ocupando el ancho de la columna de contenido.
- Botones explícitos de confirmar y cancelar. Guardar al perder el foco deja de tener
  sentido cuando hay que moverse entre dos campos.
- **BREAKING de comportamiento**: hoy el alta guarda al `Enter` o al `blur`; pasa a
  guardar solo al confirmar.

**Renombrar pasa a poder editar también la descripción**

- El menú de la sección ofrece hoy "Renombrar". Con dos campos, eso pasa a ser una
  edición de los dos.

Ninguno de estos cambios borra datos. Las secciones existentes quedan con descripción
vacía.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `proyectos-secciones`: una sección pasa a tener descripción además de nombre, y el
  alta pasa a ser un formulario de dos campos con confirmación explícita.

## Impact

**Datos.** Migración nueva que agrega `description text` a `sections`, nullable y sin
default, siguiendo el patrón de `projects.description`. **Las políticas de RLS no se
tocan**: las de `sections` son por fila y ya cubren cualquier columna nueva, y el `grant`
no enumera columnas.

**Tipos.** Regenerar con `pnpm db:types:local`, nunca contra el remoto. Ojo que
`lib/sections/use-sections.ts` tiene una **lista literal de columnas** en su `select`, y
`lib/sections/mutations.ts` la repite en el `select` del insert: la columna nueva no
aparece sola, hay que sumarla a mano en los dos lugares. También `SectionPatch`, que hoy
solo admite `name` e `is_collapsed`.

**Validación.** `lib/validation/sections.ts` tiene un esquema de un solo campo y un
comentario que dice *"solo tiene nombre"*. Por la regla de frontend, un formulario de dos
campos va con React Hook Form y Zod — el alta actual no usa ninguno de los dos.

**Código.** `components/sections/section-list.tsx` concentra casi todo: el alta, la
edición inline y el encabezado de la sección. La columna del tablero
(`components/board/board.tsx`) también muestra la sección, con ancho fijo.

**Documentación.** `docs/data-model.md`, `docs/product-spec.md` y el spec.

**Riesgo puntual.** El atajo de agregar sección funciona **buscando el botón por su
texto literal**. Cualquier cambio en ese texto lo rompe en silencio.

**Fuera de alcance.** El ancho de la columna del tablero. El contador de tareas por
sección. La descripción de un proyecto, que ya existe.
