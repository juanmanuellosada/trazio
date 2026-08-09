## Context

Hay dos contadores, separados a propósito por D-H de la fase 3, que comparten
la definición de "pendiente" pero no el camino de código:

- `lib/tasks/today-count.ts` — servidor, para el panel lateral. Tareas
  propias sin completar con `due_date <= hoy` o `due_at <= fin de hoy`, más
  `countHabitsPendingToday`.
- `lib/reminders/use-app-badge.ts` — cliente, para el badge. Filas de
  `reminders` de hoy con `delivered_at is null`, más
  `countHabitsPendingToday`.

Los dos usan `lib/habits/pending-today.ts` para la parte de hábitos. La
divergencia está entera en la otra mitad: uno cuenta tareas y el otro
recordatorios.

Sobre el soporte de plataforma, verificado contra la documentación de Chrome
y de MDN: la API de badging está disponible en Chromium sobre Linux, pero el
badge **no se muestra** en el ícono. Solo se pinta en Windows y macOS con la
PWA instalada. No es algo que este proyecto pueda arreglar.

## Goals / Non-Goals

**Goals:**

- Un solo número para "cuánto me queda hoy", en las tres superficies donde
  aparece.
- Que ese número exista en Linux, donde el badge no se pinta.

**Non-Goals:**

- Hacer funcionar el badge en Linux. No depende de este código.
- Tocar el envío de notificaciones push.
- Unificar los dos caminos de código en uno. D-H los separó a propósito: uno
  corre en el servidor para el render inicial, el otro en el cliente con
  refresco cada minuto. Lo que se unifica es la **definición**, no el camino.

## Decisions

### D-A — El badge cuenta tareas, y deja de contar recordatorios

El conjunto pasa a ser el de `getTodayTaskCount`: tareas sin completar con
vencimiento hoy o anterior, más hábitos pendientes.

**Por qué reemplazar y no sumar:** un recordatorio casi siempre es *sobre*
una tarea que ya entra en el conteo, así que sumarlos contaría dos veces la
misma cosa. El caso donde no se solapan —un recordatorio que salta hoy por
una tarea que vence el viernes— existe, pero sumarlo haría que el ícono diga
un número que no coincide con ninguna pantalla, que es exactamente el
problema que este cambio viene a resolver.

**Consecuencia aceptada:** se pierde la señal "hoy te va a saltar un aviso
por algo de la semana que viene". Nunca fue explícita —el badge no
distinguía— y quien quiera verla tiene la notificación push, que es el canal
propio de un recordatorio.

### D-B — El título del documento lleva el mismo número

`document.title` pasa a `(8) Trazio` cuando hay pendientes, y vuelve a
`Trazio` cuando no hay. Es la convención de toda la web (Gmail, Slack,
Linear) y la única superficie que funciona en Linux, sin instalar la PWA y en
cualquier navegador.

**Alternativas consideradas:** un ícono de favicon generado con el número
dibujado encima (funciona pero hay que dibujar en un canvas y reemplazar el
`<link rel="icon">`, y se ve mal en pestañas chicas), y un indicador propio
dentro de la aplicación (que ya existe: es el contador del panel lateral, y
no resuelve el caso de "la ventana está de fondo").

**Cuidado con Next.js:** el título lo maneja el `metadata` del App Router. La
escritura desde el cliente tiene que convivir con eso y no pelearse en cada
navegación — el número se reaplica después de cada cambio de ruta, no una
sola vez al montar.

### D-C — El conteo de tareas del cliente no reusa el del servidor, pero sí su criterio

`getTodayTaskCount` corre en el servidor con `lib/supabase/server`. El badge
necesita refrescarse cada minuto en el cliente. Se escribe la consulta
equivalente con el cliente de browser, y el criterio de "atrasada o vence
hoy" sale del mismo lugar que ya usa la vista Hoy (`lib/tasks/hoy-filter.ts`)
en vez de escribirse una tercera vez.

Un comentario cruzado en los dos archivos, igual que el que ya existe para
`pending-today.ts`: si los criterios se separan, el panel lateral y el ícono
van a decir números distintos, que es el defecto que este cambio arregla.

### D-D — El módulo se muda

`useAppBadge` vive en `lib/reminders/` por su origen histórico, no por lo que
hace: después de este cambio no toca la tabla `reminders` ni una sola vez.
Se muda a un módulo propio junto con el del título, y el hook que sincroniza
las dos superficies pasa a llamarse por lo que cuenta, no por dónde nació.

Es renombrar, no reescribir. Vale hacerlo ahora, mientras el cambio ya toca
ese archivo entero, y no dejarlo como deuda con un nombre que miente.

## Risks / Trade-offs

**[El título parpadea o se pisa con el de la ruta]** → D-B: reaplicar después
de cada navegación. Verificar navegando entre pantallas, no solo al cargar.

**[Un número en el título molesta a quien no lo quiere]** → No se ofrece
apagarlo, por ahora. Si molesta, el lugar natural es el interruptor de
notificaciones de Configuración, y sería un cambio chico. No se adelanta.

**[La consulta del cliente cada minuto]** → Es un `count` con `head: true`
sobre un índice que ya existe, igual que la que reemplaza. Sin cambio de
costo.
