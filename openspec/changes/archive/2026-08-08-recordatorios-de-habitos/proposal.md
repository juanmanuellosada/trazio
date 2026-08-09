## Why

Un hábito es justo lo que se olvida. Una tarea la ves en Hoy porque la
pusiste vos; un hábito de las 7:00 se pierde si nadie avisa. Hoy Trazio
tiene toda la infraestructura de push funcionando —suscripciones por
dispositivo, `pg_cron` cada minuto, edge function, entrega única— pero la
usa solo para tareas: el spec funcional dice explícitamente que un hábito no
tiene recordatorios. Es el hueco más grande frente a las apps de hábitos del
mercado (Streaks, TickTick, Habitica) y el más barato de cerrar, porque no
hay que construir nada de la cañería, solo enchufar los hábitos.

## What Changes

- Un hábito SHALL poder tener varios recordatorios push, igual que una tarea.
- El momento de un recordatorio de hábito es **siempre relativo** a la hora
  del hábito: "a la hora", 10/15/30/45 minutos antes, 1/2/3 horas antes. No
  existe el momento puntual absoluto que sí tienen las tareas — un hábito se
  repite, un instante fijo no significaría nada más allá del primer día.
- Para un hábito **sin hora programada** ("todo el día"), el desfase se
  calcula desde la **hora de referencia** que ya existe en Configuración, la
  misma que usan las tareas sin hora.
- El recordatorio **sigue la reprogramación puntual** de ese día: si el
  hábito se movió a otra hora para hoy (`habit_schedule_overrides`), el aviso
  se corre con él.
- **NUNCA** avisa un hábito que ese día ya se completó, se salteó, no toca
  por su frecuencia, está archivado, o cuya fecha es anterior a su creación.
  Es exactamente la definición de "pendiente de hoy" que ya vive en
  `lib/habits/pending-today.ts`, aplicada en el momento del envío.
- La notificación muestra el nombre del hábito y, al tocarla, abre la
  pantalla de Hábitos.
- Se mantiene la **entrega única** de D7: cada hábito, cada día y cada
  desfase se entregan como máximo una vez, y un envío que falla no se
  reintenta.
- El badge del ícono no cambia: ya cuenta hábitos pendientes de hoy.

Sin cambios de comportamiento en los recordatorios de tareas.

## Capabilities

### New Capabilities

- `recordatorios-de-habitos`: qué recordatorios admite un hábito, cómo se
  resuelve su momento (relativo, con override y con hora de referencia),
  cuándo NO se envía (completado, salteado, archivado, no toca), la entrega
  única por hábito/día/desfase, y el contenido y destino de la notificación.

### Modified Capabilities

- `esquema-datos`: suma la tabla de reglas de recordatorio por hábito y la
  tabla de entregas que garantiza la entrega única, ambas con su RLS.
- `habitos`: el formulario de alta y edición de un hábito suma la sección de
  recordatorios; hoy el spec afirma que un hábito no tiene recordatorios.
`recordatorios-push` **no** cambia: sus requirements siguen siendo verdaderos
tal como están. Que la edge function reclame además avisos de hábito y que el
payload lleve el destino resuelto son detalles de implementación (design.md,
D-H), no un cambio de comportamiento especificado para las tareas.

## Impact

**Base de datos** — dos tablas nuevas (`habit_reminders`,
`habit_reminder_deliveries`) con RLS en la misma migración que las crea; una
función `claim_due_habit_reminders()` análoga a `claim_due_reminders()`;
`user_preferences` ya aporta `timezone` y `reference_time`, no cambia.

**Edge function** — `supabase/functions/enviar-recordatorios/index.ts` suma
un segundo reclamo y un payload distinto. El `pg_cron` existente no cambia:
es la misma función la que se invoca.

**Service worker** — `public/sw.js` pasa a distinguir el destino según el
payload (`/tarea/<id>` o `/habitos`).

**Interfaz** — `components/habits/habit-form-dialog.tsx` suma el bloque de
recordatorios; se reusa el patrón del selector de tareas y
`lib/reminders/relative-options.ts`.

**Lógica compartida** — `lib/habits/pending-today.ts` y `lib/habits/today.ts`
definen hoy "pendiente de hoy" en TypeScript; el envío corre en SQL, así que
esa misma regla queda expresada dos veces y hay que dejarlo explícito para
que no se separen.

**Fuera de alcance** — recordatorios por email (D7 y decisión de producto),
recordatorio puntual absoluto sobre un hábito, y recordatorios sobre hábitos
archivados.
