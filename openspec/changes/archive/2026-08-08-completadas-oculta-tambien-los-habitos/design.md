## Context

La barra de opciones de vista tiene dos interruptores relacionados con
hábitos y completadas, y son independientes:

- **"mostrar hábitos"** — todo o nada: saca los hábitos de la vista.
- **"mostrar completadas"** — hoy, solo tareas.

D50 decidió que un hábito salteado se ve marcado en el calendario y no
desaparece. Saltear y completar son estados distintos y esa distinción es
deliberada: saltear es "decidí no hacerlo", no "lo hice".

## Goals / Non-Goals

**Goals:** que el interruptor signifique lo mismo para tarea y para hábito, y
que signifique lo mismo en el calendario que en la lista.

**Non-Goals:** tocar el interruptor de hábitos, tocar qué significa saltear,
la pantalla de Hábitos, y agregar un tercer interruptor solo para hábitos
completados.

## Decisions

### D-A — Completado se oculta, salteado no

El criterio es el estado, no el tipo: se oculta lo que está **hecho**. Un
hábito salteado sigue visible con las completadas apagadas, porque un salteo
no es una cosa hecha — es una pendiente que se decidió no hacer, y es
información que la persona quiere ver justamente cuando está mirando qué le
queda del día.

Coincide con D50, que ya decidió que el salteo se ve. Este cambio no lo
altera.

### D-B — En el calendario y en la lista de Hoy, no solo donde se pidió

El pedido fue sobre el calendario. Aplicarlo solo ahí deja el bloque de
hábitos de Hoy mostrando los ya marcados con el mismo interruptor apagado, a
una pestaña de distancia. Un control cuyo significado depende de la forma de
ver es más difícil de explicar que el problema original.

**Decisión revisable:** si en uso resulta que en la lista de Hoy molesta —
porque ahí el bloque de hábitos es corto y ver los tachados da sensación de
avance— la corrección es sacarlo de la lista, no agregar un interruptor
nuevo.

### D-C — El contador sigue contando todos

El bloque de hábitos de Hoy muestra cuántos se hicieron. Ese contador NO
cambia: sigue diciendo "2 de 5". Es lo que explica por qué la lista tiene
tres bloques en vez de cinco; sin él, los hábitos completados desaparecerían
sin dejar rastro y parecería que se perdieron.

### D-D — Se implementa después del calendario continuo

`components/calendar/` está siendo reescrito por `calendario-scroll-infinito`
(virtualización de columnas, tira continua, datos por tramos). Tocar el
filtrado de bloques ahí en paralelo garantiza un conflicto. Este cambio entra
después, sobre el árbol ya asentado.

## Risks / Trade-offs

**[Un hábito que desaparece al marcarlo puede sorprender]** → Es el mismo
comportamiento que ya tiene una tarea al completarse con la opción apagada,
así que no es una regla nueva que aprender. El contador de D-C deja el rastro.

**[Se confunde con el interruptor de hábitos]** → Son dos controles distintos
en el mismo panel y ahora los dos afectan hábitos. Revisar los rótulos: si
"mostrar hábitos" y "mostrar completadas" quedan ambiguos juntos, el arreglo
es el texto del panel, no la lógica.
