## Context

`components/sections/section-list.tsx` concentra las tres superficies de una sección: el
alta (`AddSectionRow`), la edición del nombre inline, y el encabezado que la muestra en
la lista.

El alta no es un formulario: es un botón que al pulsarse se reemplaza por un único
`<Input>` que guarda al `Enter` o al perder el foco, y cancela con `Escape`. No usa React
Hook Form ni Zod, contra lo que pide `.claude/rules/frontend.md` para formularios.

La tabla `sections` no tiene descripción. `projects` sí, y es el patrón a copiar.

Restricciones que condicionan: **D13** (React Hook Form), **D39** (el contenido se centra
con `w-full max-w-content mx-auto`, sin umbral), **D24** (ninguna acción disponible solo
por un gesto), y la regla del proyecto de que **la política de RLS se escribe en la misma
migración que crea la tabla** — acá no aplica porque la tabla ya existe con la suya.

## Goals / Non-Goals

**Goals:**

- Que una sección pueda decir para qué es, no solo cómo se llama.
- Que el formulario de alta use el ancho que ya tiene disponible.
- Que con dos campos se pueda escribir sin que se guarde a mitad de camino.

**Non-Goals:**

- La descripción de un proyecto, que ya existe.
- El ancho de la columna en vista tablero.
- Un contador de tareas por sección.
- Rehacer la edición inline del nombre por fuera de lo que exija el segundo campo.

## Decisions

### D-A. La columna copia el patrón de `projects.description`

`description text`, nullable, sin default y sin restricción de largo, igual que la de
proyectos. No hay motivo para que una sección tenga reglas distintas que un proyecto.

**Las políticas de RLS no se tocan.** Las de `sections` son por fila y ya cubren
cualquier columna nueva, y el `grant` no enumera columnas. Escribir políticas nuevas acá
sería ruido.

No hay backfill: las secciones existentes quedan con descripción vacía, que es
exactamente lo que significa.

### D-B. Guardar al perder el foco deja de servir, y por eso hay confirmación explícita

Hoy el alta guarda al `Enter` o al `blur`. Con un solo campo eso es cómodo. Con dos, es
una trampa: pasar del nombre a la descripción es un `blur`, y guardaría la sección a
medio escribir.

Así que el alta pasa a tener **confirmar y cancelar explícitos**. Es un cambio de
comportamiento observable y hay que asumirlo como tal: quien venía escribiendo el nombre
y apretando `Enter` ahora tiene un paso más.

`Escape` sigue cancelando, y `Enter` en el campo de nombre puede seguir confirmando
—es lo que espera quien solo quiere el nombre—, pero eso hay que decidirlo mirándolo, no
por escrito.

### D-C. Es un formulario de verdad: React Hook Form y Zod

Dos campos con validación y confirmación explícita es exactamente el caso que
`.claude/rules/frontend.md` y **D13** cubren. El esquema vive en `lib/validation/`, donde
ya está el de sección — que hoy tiene un solo campo y un comentario que dice *"solo tiene
nombre"*, y hay que corregir los dos.

### D-D. El ancho no se arregla tocando el contenedor

La columna ya es `w-full max-w-content mx-auto`. Lo que limita es un `max-w-64` en el
campo. **Se saca esa clase; no se toca el contenedor ni `--container-content`.**

`docs/design-system.md` tiene una advertencia parecida para otro caso: si algo se ve
angosto, se mira la clase del componente, no el token de ancho de la aplicación. Vale
igual acá.

### D-E. Dónde se muestra la descripción

Debajo del nombre en el encabezado de la sección, con menos peso visual que el nombre —el
mismo patrón que ya usa la fila de una tarea para su descripción.

**En vista tablero no se muestra.** La columna mide 288px de ancho fijo y su encabezado
es una línea: meter ahí una descripción la rompe. Que un atributo exista no obliga a
mostrarlo en todas las superficies.

Si la sección no tiene descripción, no se dibuja nada — ni un espacio vacío ni un texto
de relleno.

## Risks / Trade-offs

**El atajo de agregar sección busca el botón por su texto literal** → Si el rediseño
cambia ese texto, el atajo se rompe **en silencio**: no falla, simplemente no encuentra
nada. Hay que verificarlo apretando la tecla, no leyendo el código.

**Un paso más para crear una sección con solo nombre** → Es el costo de D-B. Se mitiga si
`Enter` en el nombre confirma, pero eso se decide mirándolo.

**Las columnas se enumeran a mano en dos lugares** → El `select` de la consulta y el del
insert repiten la lista literal. Una columna nueva no aparece sola, y el síntoma es que
la descripción se guarda pero vuelve vacía. Es el error más probable de esta tanda.

**Tocar el esquema después de varias tandas de solo interfaz** → Es la primera migración
en varias rondas. Aplicarla en local, regenerar tipos con `pnpm db:types:local` y **nunca**
apuntar al remoto.

## Open Questions

- Si `Enter` en el campo de nombre debería confirmar la sección o pasar a la descripción.
  Se resuelve usándolo, no discutiéndolo.
