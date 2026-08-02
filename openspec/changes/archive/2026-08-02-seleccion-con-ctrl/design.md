## Context

La selección múltiple tiene casilleros propios —distintos del de completar—, rango con
`Shift`, salida con `Escape` y una barra de acciones abajo con siete controles: contador,
seleccionar todas, mover, prioridad, tres atajos de fecha, eliminar y cerrar.

El casillero está oculto hasta que el cursor pasa por encima, y una vez que hay algo
seleccionado todos quedan visibles.

`Ctrl` no se lee en ninguna parte del código. El único modificador implementado es `Shift`.

Y hace unas horas el **clic derecho** sobre una tarea empezó a abrir su menú de acciones.

## Goals / Non-Goals

**Goals:**

- Entrar al modo de selección sin tener que encontrar un control oculto.
- Poder etiquetar en lote, que es de lo que más sentido tiene hacer de a muchos.
- Que la barra no se vuelva ilegible al sumarle cosas.

**Non-Goals:**

- Completar en lote.
- Fechas arbitrarias en lote: los tres atajos de hoy se quedan como están.
- Rediseñar el modo de selección.

## Decisions

### D-A. `Ctrl`+clic se suma, no reemplaza

El casillero sigue funcionando y `Shift` sigue haciendo rango. `Ctrl`+clic es un camino más.

Sacar el casillero sería peor: en una pantalla táctil no hay `Ctrl`, y quedaría sin forma de
seleccionar. Por eso el requisito nuevo dice que el modo se activa **también** así, no
**solo** así.

### D-B. El cruce con el clic derecho hay que mirarlo, no razonarlo

En algunas plataformas `Ctrl`+clic **es** el clic derecho. Y en este proyecto el clic derecho
acaba de empezar a abrir el menú de la tarea, sobre el mismo elemento.

O sea que los dos gestos pueden colisionar según el sistema, y el resultado sería que
intentar seleccionar abre un menú. **Hay que probarlo en las plataformas que importen**, no
deducirlo de la documentación.

Si colisionan, la salida no es elegir uno: es que en esa plataforma el modificador sea el que
ahí corresponda.

### D-C. Etiquetar en lote: sumar, no reemplazar

Las etiquetas de una tarea se guardan por reemplazo del conjunto completo. Llevar eso al lote
significaría que etiquetar diez tareas con "urgente" **les borra las etiquetas que ya tenían**.

Así que en lote la operación es **sumar**: las elegidas se agregan a lo que cada tarea ya
tiene.

Es una diferencia deliberada con la de una tarea sola, y tiene su motivo: cuando editás una
tarea ves sus etiquetas y elegís el conjunto final; cuando editás diez, no ves nada, y un
reemplazo silencioso destruye información que no estabas mirando.

**Lo que no resuelve esto es quitar una etiqueta de muchas tareas.** Es una operación distinta
y no se pidió; si hace falta, va aparte.

### D-D. El menú de más es porque la barra ya está llena

La barra tiene siete controles y le sumamos etiquetas. En 390px eso no entra.

Lo que se usa menos va detrás de un menú, como mostró el dueño. Cuál es "lo que se usa menos"
se decide mirándolo — pero **eliminar no puede quedar escondido y tampoco puede quedar
demasiado a mano**: es destructivo sobre varias tareas a la vez.

## Risks / Trade-offs

**`Ctrl`+clic puede ser el clic derecho** → D-B. Es el riesgo real y solo se ve probando.

**Etiquetar en lote se comporta distinto que etiquetar una** → Deliberado, por D-C, pero es una
inconsistencia y alguien la va a notar. Que la interfaz diga que suma, no que reemplaza.

**Una barra con menú esconde acciones** → Es el mismo riesgo que tuvo agrupar las opciones de
vista, y ahí se resolvió marcando el estado. Acá lo que hay que cuidar es que lo escondido no
sea lo que más se usa.

**`Ctrl`+clic sin querer** → Un clic con `Ctrl` apretado por accidente hoy abre el detalle;
después va a seleccionar. Es menos grave que al revés, pero es un cambio de comportamiento.

## Open Questions

- Qué acciones van al menú de más. Se decide mirando la barra llena, no antes.
