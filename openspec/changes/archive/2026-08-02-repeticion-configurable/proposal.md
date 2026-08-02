## Why

El dueño quiere dos cosas del editor de repetición: **opciones rápidas derivadas de la fecha
de la tarea** —"cada mes el 5", "cada año el 5 de abril" si la tarea es del 5 de abril— y una
**"Personalizada"** con su propio diálogo, donde se elija según qué fecha cuenta, cada cuánto,
qué días y cuándo termina.

Hoy no hay ninguna opción rápida: hay un desplegable genérico de día, semana, mes o año. El
editor **ni siquiera recibe la fecha de la tarea**. Y no existe "personalizada".

Peor: la regla que arma nunca incluye los días de la semana ni el día del mes. Un comentario
del propio archivo lo admite — si el lenguaje natural entendió "cada lunes", tocar la
frecuencia en el editor **destruye** esa parte.

Lo de "finaliza" ya está, con modelo y editor, y hasta con una opción de más —después de N
veces— que el dueño no pidió.

**Y hay una parte que toca el modelo.** El dueño quiere elegir si la recurrencia cuenta desde
la fecha programada o desde la de completado. Hoy eso **no se elige**: se deduce de la forma
de la regla, y está fijado en el spec como requisito. Si la regla nombra días o fechas, cuenta
desde el vencimiento; si es un intervalo puro, desde el completado.

Eso acopla dos cosas que no tienen por qué ir juntas: **no se puede pedir "cada 3 días desde el
vencimiento"** ni "cada lunes desde que lo completé". Desacoplarlas es una columna nueva.

## What Changes

**Opciones rápidas derivadas de la fecha de la tarea**

- Cada día, cada semana el <día>, cada día laborable, cada mes el <número>, cada año el
  <día de mes>. Los textos salen de la fecha de la tarea, no son fijos.
- Y "Personalizada…", que abre su propio diálogo.

**El editor deja de destruir la regla**

- Pasa a generar los días de la semana y el día del mes, no solo la frecuencia y el
  intervalo. Hoy tocar el editor sobre una regla que vino del lenguaje natural le borra esa
  parte.

**Un diálogo de repetición personalizada**

- Según qué fecha cuenta, cada cuántas unidades, qué días de la semana, y cuándo finaliza.
- **Se comparte con los eventos de calendario**, que necesitan lo mismo salvo la primera
  pregunta.

**El ancla se puede elegir**

- Deja de deducirse siempre de la forma de la regla. Cuando el usuario elige, gana su
  elección; cuando no, se sigue deduciendo como hasta ahora.
- **BREAKING** de contrato: modifica un requisito vigente que dice que el ancla se deriva del
  tipo de regla.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tareas-recurrentes`: el ancla de la recurrencia pasa a poder elegirse en vez de derivarse
  siempre de la forma de la regla, y el editor pasa a ofrecer opciones derivadas de la fecha
  de la tarea y una repetición personalizada.

## Impact

**Datos.** Columna nueva en `tasks` para el ancla elegido, que puede quedar vacía. Las
políticas de RLS **no se tocan**: son por fila.

**Código.** `components/tasks/recurrence-editor.tsx` se rehace: hoy son cuatro controles
sueltos. La función que arma la regla tiene que aprender a generar los componentes de
calendario. La que deriva el ancla pasa a mirar primero la columna.

**Compartido.** El diálogo personalizado lo va a usar también el alta de eventos. Hay que
escribirlo pensando en eso, y que su primera pregunta —según qué fecha cuenta— **pueda
ocultarse**, porque en un evento no significa nada.

**Riesgo.** Las tareas existentes tienen su ancla deducida. Al agregar la columna vacía,
todas siguen deduciéndose igual: nada cambia hasta que alguien elija. Eso hay que
comprobarlo, no suponerlo.

**Fuera de alcance.** El parser de lenguaje natural, que ya genera reglas con días y meses.
La generación de la siguiente ocurrencia, que funciona. El fin de la serie, que ya está.
