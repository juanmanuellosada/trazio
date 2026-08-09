## Why

El interruptor "mostrar completadas" apaga las tareas hechas y deja los
hábitos hechos a la vista. En el calendario eso se nota especialmente: se
apagan las completadas para ver qué queda del día, y los bloques de los
hábitos ya marcados siguen ocupando la grilla.

El interruptor se lee como "no me muestres lo que ya hice". Que signifique
solo "tareas" es un detalle de implementación que se filtró al producto: el
spec, hoy, dice literalmente "tareas completadas".

## What Changes

- El control de completadas SHALL cubrir también los hábitos: con la opción
  apagada, un hábito ya marcado ese día deja de mostrarse.
- Aplica **en el calendario y en la lista de Hoy**, las dos superficies donde
  hoy conviven hábitos y el interruptor. Un interruptor que significa una
  cosa en una vista y otra en la de al lado es peor que la incoherencia que
  se viene a corregir.
- Un hábito **salteado NUNCA SHALL ocultarse**: saltear no es completar. D50
  ya decidió que un hábito salteado se ve marcado y no desaparece, y esa
  decisión no se toca.
- El contador de hábitos de Hoy ("2 de 5 hechos") SHALL seguir contando
  todos: es justamente el dato que explica por qué faltan bloques en la lista.
- El control de completadas y el de hábitos siguen siendo **independientes**:
  apagar hábitos los saca a todos, apagar completadas saca solo los hechos.

## Capabilities

### Modified Capabilities

- `opciones-de-vista`: el control de completadas deja de hablar solo de
  tareas.
- `vista-calendario`: un bloque de hábito completado responde al control.

## Impact

**Componentes** — el filtrado del calendario y el bloque de hábitos de Hoy.
`components/calendar/` está siendo reescrito ahora mismo por el cambio
`calendario-scroll-infinito`: **este cambio se implementa después de que ese
cierre**, no en paralelo.

**Datos** — ninguno. La marca de completado del día ya se consulta para
pintar el estado del hábito.

**Fuera de alcance** — la pantalla de Hábitos, que no tiene barra de opciones
de vista y cuyo propósito es justamente ver el estado de todos; el mini-mapa
de 14 días; y cambiar qué significa saltear.
