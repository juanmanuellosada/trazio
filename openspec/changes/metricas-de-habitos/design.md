## Context

Hoy la única métrica de un hábito es la racha (`calcular_racha_habito`,
capacidad `rachas-de-habitos`), calculada al leer y nunca guardada (D10). La
racha es honesta sobre su propia definición, pero es dura: un hábito diario
que falla un día vuelve a 0, sin importar cuántos días llevaba antes. Lally,
van Jaarsveld, Potts & Wardle (2010) — 96 personas formando un hábito diario
real, mediana de 66 días hasta la automaticidad, rango de 18 a 254 — muestran
que fallar un día no afecta materialmente el proceso de formación de un
hábito. La racha, tal como está definida, no refleja ese hallazgo: sigue
tratando un día salteado o sin marcar como el fin de la racha.

Este cambio no toca la racha ni su cálculo (fuera de alcance: `docs/decisions.md`
D50 y la capacidad `rachas-de-habitos` siguen intactas). Agrega dos métricas
nuevas, calculadas con el mismo criterio de D10, que se muestran junto a la
racha existente en la misma tarjeta.

## Goals / Non-Goals

**Goals:** una métrica de constancia que no se rompa por un mal día, un
contador de repeticiones que nunca baje, y una única línea de referencia
científica al pie de la pantalla — todo calculado al leer, sin columnas
nuevas.

**Non-Goals:** tocar la racha o su cálculo; cualquier gráfico o curva de
progreso; puntajes, insignias, niveles o comparación entre personas; texto
motivacional más allá de la línea de referencia; encadenar un hábito a otro
(evaluado y descartado, ver `proposal.md`).

## Decisions

### D-A — Ventana de constancia: 30 días calendario, acotada por la creación del hábito

La constancia se mide sobre los últimos 30 días calendario terminados hoy,
recortados por `habits.created_at` cuando el hábito es más joven que eso —
mismo criterio que ya usa `isHabitDueOn` para no evaluar fechas anteriores a
la creación (requirement "Un hábito no aparece en fechas anteriores a su
creación"). Un hábito de 12 días de vida mide su constancia sobre esos 12
días, no sobre 30 con 18 días "en contra" que nunca pudieron cumplirse.

**Por qué 30 y no otro número.** Es el propio ejemplo del dueño ("28 de los
últimos 30 días") y una ventana mensual es la que mejor separa "una mala
semana" de una tendencia real, sin ser tan larga como para que un cambio de
hábito de vida (dejar de fumar, por ejemplo) tarde meses en reflejarse.

**Por qué se reutiliza, no se agrega, la consulta del mini-mapa.**
`getHabitCompletionsHistory`/`fetchHabitCompletionsHistory`
(`lib/habits/get-habit-completions-history.ts`,
`lib/habits/use-habit-completions-history.ts`) y su equivalente de salteos
(`get-habit-skips-history.ts`) ya traen una ventana fija —hoy 14 días,
`MINI_MAP_DAYS`— para todos los hábitos del usuario en una sola consulta.
30 días es un superconjunto de esos 14, así que la ventana se extiende ahí
mismo (una constante nueva, `CONSTANCY_WINDOW_DAYS = 30`, con
`MINI_MAP_DAYS` quedando en 14 para el recorte visual del mini-mapa) en vez
de agregar una segunda consulta: la constancia, el mini-mapa y el progreso
semanal de `times_per_week` (`currentWeekProgress`, que ya lee de esta misma
historia) terminan compartiendo una sola llamada de red.

### D-B — Un día salteado sale del denominador, en las tres frecuencias donde aplica

De las tres formas de tratar un salteo que planteó el pedido —contarlo como
hecho, contarlo como no hecho, o sacarlo del denominador— se elige la
tercera. Contarlo como hecho sería falso: no se hizo. Contarlo como no hecho
repetiría exactamente el problema que esta métrica existe para resolver
—castigar un día en el que la persona decidió, a propósito, no hacerlo— y
además contradiría D50, donde saltear "no suma ni resta". Sacarlo del
denominador es la única lectura consistente con esa misma regla, llevada de
la racha a la constancia: un día salteado no participa del cálculo, ni a
favor ni en contra.

Esto aplica a `daily` y a `specific_days`, donde la constancia cuenta días.
`times_per_week` no tiene un denominador de días (ver D-D): ahí un salteo
simplemente no suma a la cuenta de esa semana, ni resta — ya es el
comportamiento actual, sin cambios.

### D-C — Margen de gracia en el día en curso, igual que la racha

Si el último día de la ventana es hoy, no tiene marca todavía y el día no
terminó, se excluye de la ventana (no cuenta ni en el numerador ni en el
denominador) — mismo criterio que ya aplica `calcular_racha_habito` (el paso
`graced` de la migración `20260729180000_calcular_racha_habito.sql`). Sin
esto, la constancia bajaría apenas empieza el día y volvería a subir al
marcarlo, un parpadeo que no aporta nada y que además trataría "todavía no lo
hice hoy" como si fuera lo mismo que "no lo hice ayer".

### D-D — `times_per_week` se mide en semanas cerradas, no en días

"De los últimos 30 días" no significa lo mismo para un hábito de "N veces por
semana": no hay un día fijo que deba cumplirse, así que no hay un
numerador/denominador de días que tenga sentido. En cambio, la constancia de
`times_per_week` se mide en **semanas cerradas** (lunes a domingo, igual que
`rachas-de-habitos` fija sin importar `week_starts_on`) dentro de los últimos
30 días, excluyendo la semana de creación y la semana en curso — exactamente
las mismas dos exclusiones que ya aplica `calcular_racha_habito` para la
racha semanal, reutilizadas acá por consistencia y porque una semana sin
cerrar (o parcial por haber creado el hábito a mitad de semana) no se puede
juzgar todavía.

Eso da hasta 4 semanas cerradas en una ventana de 30 días (30 ÷ 7 ≈ 4.3,
menos la semana en curso). El numerador es la cantidad de esas semanas donde
la cuenta de `habit_completions` alcanzó `times_per_week`; el denominador es
la cantidad total de semanas cerradas consideradas.

Un salteo dentro de una semana no cambia este cálculo: la cuenta de la
semana ya es "cuántas veces se marcó", agnóstica de si algún otro día de esa
semana se salteó o directamente no se tocó — mismo comportamiento que ya
tiene hoy `currentWeekProgress` para la semana en curso. No hace falta ningún
cambio para que D-B se cumpla acá: ya se cumple sin tocar nada.

### D-E — Sin días o semanas elegibles, se avisa en vez de mostrar una fracción vacía

Un hábito recién creado (menos de un día elegible cumplido, o su única semana
todavía en curso) puede llegar a un denominador de 0. Mostrar "0 de los
últimos 0 días" es ruido, no información. En ese caso la tarjeta muestra
"Todavía sin datos suficientes" en el lugar de la constancia, sin fracción.

### D-F — El contador de repeticiones es una consulta de conteo por hábito, sin RPC nueva

`habit_completions` ya tiene el índice `(habit_id, completed_on desc)`
(migración `20260729170003_habit_completions.sql`), con `habit_id` como
columna líder — un `count(*)` filtrado por `habit_id` es barato sin tocar el
índice. Se pide con `.select('id', { count: 'exact', head: true }).eq('habit_id', id)`,
el mismo patrón que ya usan `use-label-task-count.ts` y
`use-subtree-task-count.ts`, en paralelo por hábito con `useQueries` — mismo
armado que `useHabitStreaks` (`lib/habits/use-habit-streaks.ts`) ya usa para
pedir la racha de cada hábito. No hace falta una función SQL nueva: a
diferencia de la racha (que agrupa en islas consecutivas, lógica que sí
amerita vivir en la base), un conteo total es una sola agregación sin
ventana ni agrupamiento, exactamente lo que PostgREST ya resuelve.

Se descarta una consulta agrupada única (`select habit_id, count(*) ... group
by habit_id`) para todos los hábitos de una vez: PostgREST expone `count()`
como agregado de cabecera de respuesta (`Prefer: count=exact`), no como
columna agrupable por `select`, así que agrupar por hábito en una sola
consulta exigiría una función SQL nueva — el mismo costo que evitar server
plano por RPC (D-E de `copiar-un-proyecto-como-markdown`) rechazó por un
motivo análogo. N consultas de conteo en paralelo (N = hábitos activos y
archivados del usuario, típicamente unos pocos) es más simple y ya tiene
precedente.

### D-G — Por qué no se dibuja la curva asintótica

Se evaluó graficar la curva de automaticidad de Lally et al. junto al
contador de repeticiones, y se descarta.

Primero, no hay una curva que dibujar que sea *la del hábito de esta
persona*: el estudio reporta una mediana de 66 días con un rango de 18 a
254 — no una curva única, sino 96 curvas distintas resumidas en una mediana.
Cualquier curva de referencia que se dibuje es la de "una persona promedio
hipotética", y superponerla contra las repeticiones reales de un hábito
específico sugiere una precisión que la evidencia no tiene: exactamente el
tipo de exageración que este cambio existe para evitar.

Segundo, un hábito de 20 repeticiones se vería "atrasado" o "adelantado"
según en qué eje se calibre esa curva genérica, y las dos lecturas son
igual de infundadas — no hay forma de calibrarla que no invente información.

Tercero, un gráfico de progreso ascendente es visualmente indistinguible de
una barra de progreso o un logro por desbloquear — el terreno de puntajes e
insignias que `proposal.md` deja explícitamente fuera de alcance, y que
`.claude/rules/copy.md` ya excluye para toda la app ("informa, no felicita").

El contador de repeticiones ya comunica "esto es acumulativo y no baja" de
la forma más simple posible, sin necesitar una curva para transmitir esa
misma idea con más riesgo y menos precisión. Recomendación: solo números y
la línea de referencia en texto — sin componente de gráfico, sin dependencia
nueva.

### D-H — La línea de referencia va una sola vez, al pie de la pantalla, no por tarjeta

Repetirla en cada tarjeta de hábito sería ruido y, con varios hábitos
activos, empezaría a leerse como el párrafo motivacional que este mismo
cambio existe para evitar. Va una sola vez, al pie de `/habitos` (después de
la sección de archivados, o después de la lista si no hay archivados),
como texto simple en `text-secondary`, sin ícono ni recuadro que le dé peso
visual de tarjeta o de alerta.

## Risks / Trade-offs

**[El contador de repeticiones agrega N consultas de conteo en paralelo]** →
D-F: mismo patrón que ya existe para la racha (`useHabitStreaks`), sin
componente nuevo de infraestructura. Con la cantidad de hábitos que maneja
un usuario real (unos pocos, no cientos), el costo es marginal.

**[Un hábito con muchos salteos en la ventana puede tener un denominador muy
chico y una fracción que parece más "perfecta" de lo esperable]** → D-B:
costo aceptado, es la consecuencia directa y correcta de que saltear no
cuenta en contra — si en algún momento se vuelve confuso, una versión futura
podría mostrar los salteos aparte ("3 salteados") en vez de solo omitirlos en
silencio, pero no es necesario para esta primera versión.

**[`CONSTANCY_WINDOW_DAYS` en 30 es un número elegido, no medido]** — igual
que D58 ya acepta para la ventana de gracia de los recordatorios de hábito:
es una elección razonable, no una medición, y queda abierta a ajustarse con
uso real.
