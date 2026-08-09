## Context

`components/tasks/task-row.tsx` ya resuelve, en cada render,
`children = allTasks.filter(t => t.parent_id === task.id)` y `hasChildren`,
que es lo que decide si dibuja el chevron. El dato está a mano: el cambio es
de presentación, no de datos.

Dos restricciones del proyecto condicionan dónde va el número:

- **D41**: el chip de proyecto va como *hermano* del botón del título, nunca
  adentro, porque el botón toma su nombre accesible de todo su contenido y
  meterlo adentro convertiría "Pagar el alquiler" en "Pagar el alquiler
  Trabajo" para quien navega por teclado o lector de pantalla — y rompería
  las pruebas que buscan tareas por su nombre. El contador cae bajo la misma
  regla.
- **La fila crece hacia abajo, en niveles** (D41): título arriba, fecha y
  etiquetas en un segundo nivel que solo se renderiza si tiene contenido.

## Goals / Non-Goals

**Goals:** mostrar el progreso sin consultas nuevas, sin romper el nombre
accesible, y sin agregar un tercer nivel a la fila.

**Non-Goals:** barra de progreso, porcentaje, contador en el panel, contar el
subárbol completo.

## Decisions

### D-A — Cuenta las hijas directas

El chevron despliega un nivel. Si el contador dijera `3/12` contando nietas y
al abrir aparecieran cuatro filas, el número estaría describiendo algo que no
se ve. Se cuentan las hijas directas: `children.filter(c => c.completed_at).length`
sobre `children.length`.

**Consecuencia aceptada:** una tarea con subtareas anidadas profundas
subrepresenta el trabajo real. Es preferible a un número que no coincide con
lo que el control de al lado despliega.

### D-B — Junto al chevron, no junto al título

El contador va pegado al chevron, en el primer nivel de la fila, como hermano
del botón del título. Tres motivos: es el control que ya habla de las
subtareas, no toca el nombre accesible (D41), y no obliga a renderizar el
segundo nivel en una tarea que no tiene fecha ni etiquetas — que hoy se ve en
una sola línea y tiene que seguir viéndose así.

### D-C — El conteo va en la etiqueta del chevron

El chevron ya dice `Mostrar subtareas de {título}` / `Ocultar subtareas de
{título}`. Pasa a decir el número: `Mostrar 5 subtareas de {título}, 2
completadas`. Así el dato llega a un lector de pantalla por el control que le
corresponde, en vez de quedar como un `2/5` suelto sin contexto.

El elemento visual del contador queda `aria-hidden`: repetirlo lo haría
anunciar dos veces.

### D-D — Siempre visible, no solo plegado

Mostrarlo solo cuando está plegado hace que el número aparezca y desaparezca
al abrir y cerrar, que es exactamente el tipo de movimiento que hace ruido en
una lista larga. Se muestra siempre que haya subtareas.

## Risks / Trade-offs

**[Un elemento más en una fila ya densa]** → La fila en 390px ya está
ajustada (D41 lo discute en detalle). El contador es de tres a cinco
caracteres pegados a un control que ya existe, así que no compite por el
ancho del título. Verificar igual en 390px antes de cerrar.

**[Las pruebas que buscan tareas por su nombre accesible]** → D-C las
protege: el contador no entra en el nombre del botón del título. Si alguna
prueba igual se rompe, es señal de que el contador quedó adentro y hay que
moverlo, no de que haya que actualizar la prueba.
