## Why

El dueño lo dijo así: *"En los recordatorios no hiciste lo que te pedí, se sigue viendo el
mismo componente que antes, y lo peor de todo es que en la parte de Fecha y hora puntual no
tiene un componente personalizado, tiene el datepicker por default del navegador."*

Tiene razón en las dos. La tanda anterior de recordatorios cambió la **lógica** —qué
opciones se ofrecen y que funcionen sin hora— y nunca tocó la forma. El pedido incluía el
rediseño.

Y lo del control nativo no es un olvido: **hay un requisito que lo prohíbe**. Dice que el
calendario, el selector de hora y la lista de prioridades tienen que ser componentes
propios, y que ninguno puede delegar en un control nativo del navegador.

Al buscarlo aparecieron **tres** lugares con controles nativos, no uno: el recordatorio
puntual, el fin de la recurrencia y el editor de eventos. Y el propio código lo reconoce:
un comentario del editor de eventos dice que copió *"el mismo criterio ya usado por el
selector de recordatorios"*. **La deuda ya se propagó, y se propagó citándose a sí misma.**

Se coló por un hueco de redacción: el requisito habla de *"los tres selectores"* —fecha,
hora y prioridad— y el recordatorio no es uno de esos tres. Cerrar el hueco importa tanto
como arreglar los casos.

## What Changes

**El requisito deja de hablar de tres selectores y pasa a hablar de cualquier control**

- La prohibición de controles nativos aplica a **cualquier** superficie donde el usuario
  elige una fecha o una hora, no solo a los tres nombrados.

**Los tres casos se corrigen**

| Dónde | Qué tiene hoy |
| --- | --- |
| Recordatorio puntual | Un campo nativo de fecha y hora |
| Fin de la recurrencia | Un campo nativo de fecha |
| Editor de eventos | Dos campos nativos de fecha y hora, y uno de fecha |

- Pasan a usar los componentes propios que ya existen: el cuerpo del selector de fecha
  —con calendario propio y lenguaje natural— y el bloque de hora del selector de
  vencimiento.

**El selector de recordatorios se rediseña**

- Los dos modos dejan de ser dos botones que se pintan distinto y pasan a ser una elección
  clara entre **fecha y hora fija** y **relativo a la tarea**.
- El modo relativo pasa de una grilla de botones a un desplegable, que es lo que el dueño
  mostró.

Sin cambios de datos ni de comportamiento: lo que se guarda y cuándo suena no cambia.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `selectores-de-atributos`: la prohibición de controles nativos deja de estar acotada a
  tres selectores y pasa a regir cualquier elección de fecha o de hora.

## Impact

**Código.** `components/reminders/reminder-picker.tsx` se rediseña y pierde su campo
nativo. `components/tasks/recurrence-editor.tsx` y
`components/calendar/edit-event-dialog.tsx` pierden los suyos.

**Reutilización.** No hay que construir nada nuevo: el cuerpo del selector de fecha ya está
pensado para compartirse —su propio comentario lo dice— y el bloque de hora vive dentro del
selector de vencimiento. **Ese bloque hay que poder usarlo desde afuera**, y hoy está
adentro de un componente que escribe en los campos de una tarea.

**Fuera de alcance.** Cambiar qué guardan esos controles. La lógica de recordatorios, que
se acaba de hacer. El editor de eventos más allá de sacarle los controles nativos — su
rediseño va en `alta-de-evento-completa`.
