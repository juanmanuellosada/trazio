## Context

El aprovisionamiento de una cuenta ya existe y es sólido:
`handle_new_user()` (migración `20260726013248`) crea perfil, preferencias y
Bandeja de entrada en la misma transacción que el `insert` en `auth.users`,
con `security definer`, y vale igual para alta con contraseña y con Google.

`app/entrar/route.ts` es la puerta de entrada real: resuelve el destino según
`user_preferences.default_view` y es lo que abre la PWA instalada.

## Goals / Non-Goals

**Goals:**

- Que la primera pantalla enseñe qué hace la app, sin explicarlo.
- Exactamente una vez por cuenta, con garantía real, no por convención.
- Texto de ejemplo iterable sin escribir una migración.
- Salida de un solo movimiento para quien no lo quiere.

**Non-Goals:**

- Recorrido guiado, globitos, checklist de primeros pasos.
- Plantillas elegibles al registrarse.
- Sembrar nada en Google Calendar.

## Decisions

### D-A — El sembrado va en el servidor, no en el trigger

La opción obvia era extender `handle_new_user()`: ya corre exactamente una
vez, ya es atómico, ya cubre los dos flujos de alta. Se descarta por dos
razones:

1. **El texto de las tareas de ejemplo es copy de producto.** Vive mejor en
   TypeScript, donde se lee, se testea y se cambia sin escribir una
   migración. Meterlo en una función `security definer` de Postgres lo
   congela detrás del ciclo de vida más rígido del proyecto.
2. **El trigger corre al registrarse, antes de confirmar el correo.** Una
   cuenta que nunca confirma quedaría con contenido sembrado que nadie va a
   ver. El sembrado en la primera entrada solo alcanza a cuentas que
   efectivamente entraron.

### D-B — La marca se reclama antes de sembrar, con un `update` condicional

`user_preferences` suma `seeded_at timestamptz`. El sembrado se dispara así:

```sql
update public.user_preferences
set seeded_at = now()
where user_id = $1 and seeded_at is null
returning user_id
```

Si devuelve una fila, esta ejecución ganó y siembra. Si devuelve cero, otra
ya lo hizo — o ya se sembró antes — y no hace nada. Dos pestañas abiertas al
mismo tiempo en la primera entrada no producen dos proyectos de ejemplo,
porque el `update` condicional es atómico.

**Consecuencia aceptada:** si el sembrado falla después de reclamar la marca,
la cuenta queda con contenido parcial y no se reintenta. Es contenido de
ejemplo, borrable con una acción (D-D), así que el modo de falla es leve. La
alternativa —reclamar al final— cambia ese riesgo por el de duplicar el
proyecto entero, que es peor y más visible.

### D-C — Las cuentas existentes se marcan como ya sembradas

La migración que agrega la columna SHALL escribir `seeded_at = now()` en
**todas** las filas existentes de `user_preferences`, en el mismo archivo.

Es el detalle que hace o rompe esta función: con la columna en `null` por
defecto y sin backfill, la primera entrada de cada cuenta que ya existe le
sembraría un proyecto de ejemplo encima de sus datos reales. Va en la misma
migración, no en un paso aparte que alguien pueda saltear.

### D-D — El ejemplo se borra entero, con el hábito y el filtro adentro

El proyecto de ejemplo ofrece "Borrar los ejemplos", que se lleva el proyecto
con sus tareas, el hábito de ejemplo **y** el filtro de ejemplo (este último,
sumado en la ampliación que agregó el filtro guardado al contenido sembrado).
El borrado de proyecto normal ya pide confirmación con el conteo de tareas (y
no es reversible); esta acción reusa ese camino, sumándole el hábito y el
filtro.

Sin esto, quien no quiere los ejemplos tiene que borrar un proyecto y después
acordarse de que además hay un hábito suelto en otra pantalla y un filtro
favorito suelto en el panel lateral. El hábito y el filtro son justamente lo
que se olvida — es el motivo de sembrarlos y también el motivo de que haya
que barrerlos junto con el proyecto.

Que la acción viva en el proyecto de ejemplo, y no en Configuración, es
deliberado: aparece donde está el ruido, no en una pantalla a la que hay que
ir a buscarla.

**Cómo se identifican el proyecto, el hábito y el filtro de ejemplo:**
`projects`, `habits` y `filters` suman cada uno una columna `is_example
boolean not null default false`, con un índice único parcial por usuario
(mismo criterio que `projects_one_inbox_per_user_idx`) que hace imposible
tener más de un proyecto, un hábito o un filtro de ejemplo por cuenta —
consistente con que el sembrado corre como máximo una vez (D-B). El nombre no
alcanza como identificador (la persona puede renombrar cualquiera de los
tres) y `habits`/`filters` no tienen FK hacia `projects` (son entidades
independientes), así que no hay cascada de base que arrastre al hábito o al
filtro al borrar el proyecto: la acción de borrado hace tres deletes —hábito
y filtro por `is_example = true`, proyecto por `id`— no una transacción de
base con cascada completa.

### D-E — El contenido enseña siendo contenido

Un proyecto, cuatro tareas, un hábito y un filtro guardado. Cada pieza existe
para mostrar algo que de otro modo no se descubre:

| Pieza | Qué enseña |
| --- | --- |
| Tarea con fecha, hora y prioridad ya puestas | Que eso se escribe en el título, no se configura. El texto de la tarea muestra la frase que lo produce. |
| Tarea con dos o tres subtareas | Que existen y que se anidan. |
| Tarea con una etiqueta | Que las etiquetas cruzan proyectos. |
| Tarea sin nada | Que no hace falta llenar campos. |
| Un hábito | Que la app tiene hábitos. Es lo más invisible de Trazio. |
| Un filtro guardado, favorito | Que se pueden guardar consultas propias y fijarlas en el panel lateral. Función de fase 2, terminada, y la más invisible de todas: ni el propio dueño del proyecto se acordaba de que existía cuando la pidió de nuevo. |

Ninguna tiene texto de instructivo del tipo "← probá tocar acá". Son tareas
que se leen como tareas; lo que enseñan lo enseñan por su forma. El texto
concreto se decide contra `.claude/rules/copy.md`.

El hábito de ejemplo se crea sin hora programada ("todo el día"): con hora
aparecería en el calendario de un día que la persona no planificó.

El filtro de ejemplo tampoco es una vidriera de sintaxis: la consulta
combina prioridad y vencimiento (`(due:overdue | due:today) &
priority:1,2`, "vencidas o de hoy, en las dos prioridades más altas"),
el tipo de vista que alguien de verdad termina guardando a mano tarde o
temprano — no una frase armada solo para mostrar que `&` y `|` existen. Nace
favorito para aparecer directo en el panel lateral, sin que haya que ir a
buscarlo a la pantalla de Filtros.

### D-F — Dónde se dispara

En el camino de entrada del servidor, junto a la resolución de destino que
`app/entrar/route.ts` ya hace, y en el equivalente del login. El sembrado
tiene que completarse **antes** de que se pinte la primera pantalla: una
Bandeja vacía que se puebla sola dos segundos después se lee como un error,
no como una bienvenida.

**Consecuencia:** la primera entrada es más lenta que las siguientes, por una
sola vez. Es aceptable; lo contrario no.

## Risks / Trade-offs

**[El backfill se olvida y se siembra encima de cuentas reales]** → D-C: va
en la misma migración que crea la columna. Verificarlo contra producción
antes de desplegar, no después.

**[El sembrado falla a la mitad]** → D-B: contenido parcial, borrable en una
acción. Aceptado.

**[Los ejemplos molestan a quien ya sabe usar la app]** → D-D: una acción los
borra a todos. Es la mitigación completa.

**[La primera entrada se hace lenta]** → D-F: por una vez, y la alternativa
—que la pantalla se pueble sola después de cargar— es peor.

**[El texto de ejemplo envejece]** → Si el parser cambia, la tarea de ejemplo
que muestra una frase del parser puede quedar mintiendo; si el lenguaje de
consulta cambia, la consulta del filtro de ejemplo puede dejar de ser válida.
Mitigación en los dos casos: un test que corra el texto real (la frase o la
consulta) por el intérprete real y verifique que sigue produciendo lo que el
ejemplo promete.

## Migration Plan

1. Migración: columna `seeded_at` + backfill en el mismo archivo.
2. Migración: columna `is_example` en `projects`, `habits` y `filters`, con
   su índice único parcial por usuario en cada una.
3. `pnpm db:types`.
4. Módulo de sembrado y cableado en el camino de entrada, incluido el filtro.
5. Acción de borrado en el proyecto de ejemplo, incluido el filtro.

**Verificación obligatoria antes de dar por cerrado:** registrarse con una
cuenta nueva de verdad y confirmar que el contenido está ahí en la primera
pantalla; después entrar con una cuenta vieja y confirmar que **no** aparece
nada.
