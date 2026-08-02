## Why

El dueño lo notó desde una subtarea: *"si vuelvo para atrás en el navegador tengo que
volver al detalle de su padre… ahora si vuelvo atrás, me manda a la landing"*.

Al investigarlo, el problema es más grande que las subtareas: **el detalle no toca el
historial en absoluto.** Es un panel que se abre con un estado en memoria, sin ruta y sin
entrada de historial. Así que el botón Atrás no cierra el detalle: te saca de donde
estabas, a la página anterior real, que si entraste desde la portada es la portada.

Eso pasa con **cualquier** tarea, no solo con las subtareas. Y es peor en el teléfono,
donde Atrás es el gesto principal para cerrar cosas: un usuario que abre una tarea y hace
el gesto de volver se va de la aplicación.

Encima, una subtarea abierta no ofrece **ninguna** forma de llegar a su padre. El dato
está disponible en el código y sin usar.

## What Changes

**Abrir el detalle deja una entrada en el historial**

- Volver atrás **cierra el detalle** y te deja donde estabas.
- Si llegaste a una tarea desde el detalle de otra, volver atrás te devuelve a esa otra. El
  caso de la subtarea sale de ahí: es una consecuencia, no un caso especial.

**Una subtarea muestra a qué tarea pertenece, y se puede ir**

- El detalle de una subtarea muestra su tarea padre y permite abrirla.

Sin cambios de datos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tareas`: abrir el detalle deja una entrada en el historial y volver atrás lo cierra; y
  el detalle de una subtarea muestra su tarea padre y permite navegar a ella.

## Impact

**Código.** El contexto que hoy guarda qué tarea está abierta pasa a coordinarse con el
historial. `components/tasks/task-detail-content.tsx` suma el acceso al padre, con un dato
que ya viene en la consulta y hoy se ignora.

**Lo que hay que cuidar.** Meter un modal en el historial es de las cosas que más fácil se
rompen: volver dos veces seguidas, la flecha de adelante, recargar con el detalle abierto,
abrir una tarea desde otra varias veces seguidas, y cerrar con la `X` o con `Escape` —que
también tienen que dejar el historial consistente, no solo el botón Atrás—.

**Por D12 no hay estado global**, así que la coordinación va donde ya está el contexto del
detalle.

**Fuera de alcance.** Darle una ruta propia al detalle: ya existe una ruta de tarea suelta
para "abrir en ventana aparte" y no se toca. Migas de pan completas de toda la cadena de
ancestros: se muestra el padre directo, que es lo que se pidió. La navegación entre tareas
hermanas, que es otra cosa y no se pidió.
