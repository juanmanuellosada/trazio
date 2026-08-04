## Context

La lista de un proyecto **no usa el agrupador para mostrar secciones**. Son dos caminos de
renderizado distintos: sin agrupación monta la lista de secciones, con agrupación monta una lista de
grupos y las secciones desaparecen. Por eso "sin agrupar" en un proyecto se ve como bloques y en
Hoy como una lista corrida: no es una regla, es que son dos componentes.

El agrupador ya sabe producir grupos con clave y rótulo. Le faltan dos casos, sección y fecha, que
el panel ya resolvió en un módulo aparte.

Cada forma de ver ya filtra los valores que sabe manejar, sin pisar la preferencia guardada. Ese
mecanismo existe y funciona; esto lo extiende, no lo reemplaza.

Restricciones: **D24** (ninguna acción disponible solo por un gesto), **D25** (la posición no es
comparable entre proyectos), **D27** (la Bandeja es un proyecto).

## Goals / Non-Goals

**Goals:**

- Los mismos agrupadores en lista que en panel, donde tengan sentido.
- Que "sin agrupar" signifique lo mismo en todas las pantallas.
- Poder ver un proyecto como una lista corrida.

**Non-Goals:**

- Agrupar por proyecto.
- Tocar el panel, que se acaba de cerrar.
- Cambiar cómo se ven las secciones cuando se agrupa por sección.

## Decisions

### D-A. "Sin agrupar" es una lista corrida, en todas partes

Un valor, un significado. Hoy son dos, y eso fue exactamente lo que el dueño señaló en el panel.

Como efecto, **aparece algo que no existía**: ver un proyecto sin bloques de sección. No es un daño
colateral, es la mitad del pedido.

El valor por defecto de Bandeja y Proyecto pasa a ser **sección**, así que al abrir se ve igual que
siempre. Lo que cambia no es lo que se ve, es que ahora tiene nombre.

### D-B. Una migración, no una traducción al leer

Después de este cambio, "sin agrupar" guardado significa lista corrida. Pero hay gente con ese valor
guardado **porque era el valor por defecto**, no porque lo eligiera — y si se lo interpreta
literalmente, abren su proyecto y lo ven plano.

Se podría traducir al leer: "en un proyecto, sin agrupar significa sección". **Eso es exactamente el
problema que estamos sacando**, y además dejaría la lista corrida inalcanzable para siempre en un
proyecto.

Va **una migración que reescribe una sola vez** las preferencias de proyecto y Bandeja que tengan
"sin agrupar", pasándolas a "sección". A partir de ahí, ese valor guardado significa lo que dice.

Es la única parte de esta ronda que toca la base. **La migración va antes que el código**: al revés,
producción sirve una pantalla que espera datos que todavía no están.

### D-C. Lo que se pierde al aplanar, y dónde va

Los bloques de sección traen tres cosas: **colapsar, agregar una tarea dentro de la sección, y el
menú de la sección** —renombrar, eliminar, reordenar—.

Agrupando por cualquier otra cosa, esos bloques no están y **las tres desaparecen de la lista**.

Por **D24** ninguna acción puede quedar disponible solo por un camino, así que hay que comprobar
dónde vive cada una fuera de la lista y, si alguna no tiene otra puerta, resolverlo antes de
soltar esto. **Colapsar es cosmético y puede perderse**; crear y administrar secciones no.

El panel ya resolvió su mitad: ofrece crear sección cuando las columnas son secciones. La lista
tiene el mismo problema y la misma forma de resolverlo.

### D-D. Dónde se ofrece cada valor

| Valor | Dónde |
| --- | --- |
| Sin agrupar | En todas |
| Sección | Bandeja y Proyecto. **Nunca** donde se cruzan proyectos |
| Fecha | En todas menos Hoy |
| Prioridad, Etiqueta | En todas |

**Sección** sigue la regla que el panel ya fijó: una sección pertenece a un proyecto, así que en una
vista que cruza proyectos no significa nada.

**Fecha en Hoy no tiene sentido**: es un solo día.

### D-E. Hoy no agrupa

La lista de Hoy dejó de ser una lista de tareas: es **una secuencia de tres tramos con eventos
intercalados, ordenada por hora**. Esa secuencia es la vista.

Agrupar la rompe, y además deja sin respuesta qué pasa con los eventos, que no tienen prioridad ni
etiqueta ni sección.

Así que **Hoy no ofrece agrupador en modo lista**. Es una pérdida frente a hoy —ofrece prioridad y
etiqueta—, pero esas opciones ya conviven mal con la secuencia desde que los eventos se
intercalaron esta mañana.

Su panel **sí** sigue agrupando: ahí no hay eventos ni secuencia que romper.

## Risks / Trade-offs

**La migración.** Es la única de la ronda, y si se sube el código sin ella el usuario ve su proyecto
plano sin haberlo pedido. Es el riesgo más concreto y el más fácil de evitar: primero la base.

**Perder acciones al aplanar** → D-C. Es el que puede romper algo sin que se note: nadie va a
extrañar el menú de una sección hasta que lo necesite.

**Quitarle el agrupador a Hoy** → D-E, asumido. Alguien puede estar usándolo hoy.

**El arrastre agrupado.** Reordenar dentro de un bloque que no es una sección no tiene dónde
persistirse. Hay que apagarlo, no dejar que parezca que funciona.

**Un proyecto grande sin bloques** se vuelve una lista muy larga. Es lo que se pidió, pero conviene
mirarlo con un proyecto real antes de darlo por bueno.
