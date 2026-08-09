## Why

El badge del ícono cuenta lo que no es. Suma los **recordatorios** de hoy sin
entregar más los hábitos pendientes, no las tareas: quien tiene ocho tareas
para hoy y ningún recordatorio configurado ve en el ícono solo el número de
sus hábitos. El contador del panel lateral, en cambio, suma tareas —las de
hoy y las atrasadas— más hábitos, que es lo que la persona entiende por
"cuánto me queda hoy". Dos números distintos para la misma pregunta.

Y hay un segundo problema, más grande para el dueño del proyecto: **en Linux
el badge no se dibuja nunca**. Chromium implementa la API —`setAppBadge`
existe y su promesa resuelve— pero el sistema no lo pinta: el badge solo se
muestra en Windows y macOS con la PWA instalada. El código pasa el chequeo de
soporte y no aparece nada, así que hoy el indicador no existe en la máquina
de quien más lo usa.

## What Changes

- El badge SHALL contar lo mismo que el contador de Hoy: tareas pendientes
  que vencen hoy o están atrasadas, más hábitos pendientes de hoy. **Deja de
  contar recordatorios**: un recordatorio es sobre una tarea que ya está
  contada, y sumarlos inflaría el número.
- El título del documento SHALL llevar el mismo número: `(8) Trazio`. Es el
  único camino que funciona en Linux, y funciona además en cualquier
  navegador y con la app sin instalar, en la pestaña y en el título de la
  ventana.
- Con cero pendientes, ni el badge ni el título SHALL mostrar número.
- **BREAKING** respecto del spec vigente: el requisito actual del badge dice
  explícitamente que suma recordatorios. Se reemplaza.

## Capabilities

### Modified Capabilities

- `recordatorios-push`: el badge cambia qué cuenta, y se le suma el título
  del documento como segunda superficie del mismo número.

## Impact

**Cliente** — `lib/reminders/use-app-badge.ts` cambia la consulta: en vez de
contar filas de `reminders`, cuenta tareas con el mismo criterio de "atrasada
o vence hoy" que usa la vista Hoy. `components/settings/app-badge-sync.tsx`
ya está montado en el layout y no cambia de lugar.

**Nombre del módulo** — el hook deja de tener que ver con recordatorios. Vive
en `lib/reminders/` por su origen, no por lo que hace; moverlo es parte del
cambio.

**Fuera de alcance** — notificaciones push (no se tocan), el contador del
panel lateral (ya cuenta bien), y hacer que el badge funcione en Linux, que
no depende de este código.
