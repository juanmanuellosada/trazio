## Context

Los hábitos son la primera entidad de Trazio que no es una tarea ni cuelga de
una. No tienen proyecto, sección, etiquetas, prioridad ni comentarios, y no se
completan: se repiten. Eso los saca del modelo mental de todo lo construido
hasta acá.

El esquema, sin embargo, no arranca de cero: `docs/data-model.md` ya especifica
`habits`, `habit_completions` y `habit_schedule_overrides` con sus columnas
desde el inicio del proyecto, y `openspec/specs/esquema-datos/spec.md` tiene un
requisito activo que **prohíbe** que existan todavía. Esta fase levanta esa
prohibición y las construye tal como estaban diseñadas.

La restricción de diseño que gobierna todo es **D10**: las rachas se calculan,
no se guardan. Un contador denormalizado se desfasa apenas hay un borrado o una
corrección. El roadmap lo repite como criterio de aceptación.

El problema real de esta fase no es el CRUD: es que **el spec funcional define
las rachas a medias**. Nombra la mejor racha sin decir cómo se calcula, escribe
el margen de gracia solo para un tipo de frecuencia, y no dice qué pasa con la
semana en curso, con la semana en que se creó el hábito, ni con el período
archivado. Este documento cierra esos huecos.

Restricciones heredadas: D1 (sin offline, marcar exige conexión), D5 (el rojo de
marca no se usa para destructivos genéricos — una racha rota no se pinta de
rojo), D8 (zona horaria IANA por usuario), D9 (fecha sin hora se guarda como
`date` para evitar corrimientos), D11 (`user_id` en toda tabla), D12 (sin
librería de estado global), D19 y D29 (paleta fija más color personalizado
validado por contraste), D25 (Hoy ordena por hora), D31 (selector de emoji).

## Goals / Non-Goals

**Goals:**

- Rachas correctas en los tres tipos, con los bordes que el roadmap exige como
  criterio de aceptación: cambio de semana, día en curso con margen de gracia, y
  hábito creado a mitad de semana.
- Un solo lugar donde vive la lógica de racha, en vez de duplicarla entre SQL y
  TypeScript.
- Encender los cuatro puntos de extensión que las fases 1 y 2 dejaron vacíos,
  sin romper lo que hoy depende de ellos.
- Usar las tablas que el data model ya especifica, con esos nombres y esas
  columnas.

**Non-Goals:**

- Cualquier cosa de calendario: arrastrar un hábito para cambiarle el horario,
  los chips de hábitos sin hora programables por arrastre, o la vista de
  calendario en sí. Es fase 4.
- Corrección retroactiva del historial. Se puede desmarcar hoy y nada más.
- Recordatorios de hábitos. El spec los excluye explícitamente de la entidad.
- Hábitos en el buscador, en el lenguaje de filtros o en la selección múltiple.

## Decisions

### D-A. Las tres tablas son las que el data model ya especificaba

`habits`, `habit_completions` y `habit_schedule_overrides`, con los nombres y
las columnas de `docs/data-model.md`. No se renombran ni se rediseñan.

**Las tres llevan `user_id` propio**, aunque el de `habit_completions` sea
derivable de `habits`. Lo exige **D11**: la política de RLS queda en una sola
comparación, sin joins, que es más rápido y muchísimo más difícil de escribir
mal. La RLS va en la misma migración que crea cada tabla.

*Alternativa descartada:* resolver la RLS de `habit_completions` con un `EXISTS`
contra `habits`. Ahorra una columna y contradice una decisión tomada, sobre la
única barrera que separa los datos de un usuario de los de otro.

Constraints que el data model no especifica y hay que fijar:

- `days_of_week` usa **1 = lunes … 7 = domingo**, la codificación ISO-8601, que
  es la que devuelve `extract(isodow from …)` en Postgres. Documentarla en la
  migración: es exactamente el tipo de cosa que se interpreta al revés seis
  meses después.
- `times_per_week` entre 1 y 7, y `NOT NULL` solo cuando
  `frequency_type = 'times_per_week'`.
- `days_of_week` no vacío, y `NOT NULL` solo cuando
  `frequency_type = 'specific_days'`.
- `habits.color` con el mismo check de paleta fija que `projects` y `labels`, y
  la misma tolerancia al color personalizado validado por contraste (D19, D29).

Realtime: `habits` y `habit_completions` entran en la publicación,
`habit_schedule_overrides` no — así lo fija el data model. Y, aprendido en la
fase 2: agregar la tabla a la publicación no alcanza, hay que sumar el handler y
la suscripción del cliente en `lib/realtime/`, o el realtime falla en silencio.

### D-B. La racha se calcula en Postgres, no en el cliente

Una función `SECURITY INVOKER` devuelve racha actual y mejor racha de un hábito.
Se llama por RPC desde el server component y desde el hook de TanStack Query,
igual que `claim_due_reminders()` en la fase 2.

Traer todo el historial de `habit_completions` al cliente solo para contar días
consecutivos no escala, y duplicar la lógica de los tres tipos entre SQL y
TypeScript garantiza que se desincronicen. `SECURITY INVOKER` mantiene la RLS
activa adentro.

El índice `(habit_id, completed_on desc)` es lo que hace barato el cálculo, y es
justamente el que el data model ya anticipaba.

*Alternativa descartada:* columnas `current_streak` y `best_streak` mantenidas
por trigger. Más rápido de leer, prohibido por D10, y con una superficie de
desincronización que no vale la pena para el volumen de una app personal.

### D-C. Las reglas de racha, tipo por tipo

El spec define esto a medias. Lo que sigue lo completa.

**Todos los días.** Días consecutivos con marca, contando hacia atrás. Si hoy
todavía no se marcó pero el día no terminó, no se corta: se cuenta desde ayer.
Si ayer tampoco tiene marca, la racha es 0.

> El spec escribe el margen de gracia solo para "días específicos". Se extiende
> a "todos los días" por coherencia: no tendría sentido que un hábito diario se
> muestre con la racha rota a las nueve de la mañana.

**Días específicos.** Solo cuentan los días configurados. Un día específico sin
marca corta la racha **una vez que ese día terminó**; mientras está en curso, se
lo trata como todavía cumplible.

**N veces por semana.** La unidad de la racha es la semana, no el día. Una
semana cuenta si se alcanzó la meta. **La semana en curso no entra en la racha
hasta que cierra el domingo**: se muestra aparte como progreso — "1 de 3" —, que
es lo que el spec insinúa al hablar de "racha actual o progreso semanal" como
dos cosas distintas.

**Mejor racha histórica.** El máximo entre todas las rachas que el hábito tuvo
alguna vez, incluida la actual si ya la superó. El spec la nombra en tres
lugares y no la define en ninguno.

**La semana de creación se excluye.** Si el hábito nació un jueves, esa semana
parcial no entra en el cómputo de `times_per_week` — no se prorratea la meta a
los días que quedaban. Empezar un jueves no debería contar como semana fallada
ni como semana regalada. Y ningún tipo evalúa fechas anteriores a
`habits.created_at`.

### D-D. La semana es lunes a domingo, fijo

Sin importar `week_starts_on`. Lo dice el spec de forma explícita para hábitos,
y se respeta.

> Esto queda en tensión con **D15**, que fijó que "próxima semana" respeta la
> preferencia del usuario — pero D15 es sobre el parser de lenguaje natural, no
> sobre hábitos. La tensión es real y conviene tenerla anotada: si alguien
> configura que su semana empieza el domingo, la racha semanal de sus hábitos va
> a usar otro corte que el resto de la aplicación. Se acepta porque una racha
> que cambia de valor al tocar una preferencia es peor que una que no coincide
> con el calendario.

### D-E. Solo se marca y desmarca hoy

El casillero existe cuando el hábito toca hoy, y permite marcar y desmarcar. Los
días pasados **no** se pueden corregir: el mini-mapa de los últimos 14 días es
de solo lectura.

Poder desmarcar hoy cubre el error de un click, que es el caso real. Habilitar
la corrección retroactiva abriría preguntas que el spec no responde —qué pasa al
marcar un día en que el hábito no tocaba, o anterior a su creación— y volvería
interactivo un componente que el spec describe como informativo.

`Ctrl/Cmd+Z` **no** cubre hábitos: el spec define el deshacer solo para tareas, y
desmarcar ya es la operación inversa disponible.

### D-F. Desarchivar no reanuda la racha

Un hábito archivado desaparece de Hoy, del contador y del badge, pero conserva
intactos todos sus `habit_completions` y `habit_schedule_overrides`.

Al desarchivar, el historial vuelve completo y la **mejor racha** se conserva
—era un hecho histórico y sigue siéndolo—, pero la **racha actual arranca en
cero**: los días sin marcar del período archivado la cortaron, como cualquier
interrupción.

*Alternativa descartada:* ignorar el período archivado en el cálculo, como si el
hábito no hubiera existido. Mostraría una racha de cuarenta días a alguien que
hace tres meses no lo hace, que es exactamente la clase de dato que vuelve
inútil una racha.

### D-G. Todo se resuelve en la zona horaria del usuario

"Hoy", "el día terminó" y "la semana cerró" se calculan con
`user_preferences.timezone`, reusando el mecanismo que ya resuelve las tareas
atrasadas. No se inventa uno nuevo.

`habit_completions.completed_on` es `date` y no `timestamptz`, coherente con D9:
marcar es un hecho del día, no de un instante, y guardarlo como fecha evita los
corrimientos de un día al convertir zonas.

### D-H. Los dos contadores son dos caminos de código distintos

El spec pide que **ambos** sumen hábitos, y hoy ninguno lo hace:

| Contador | Dónde | Hoy cuenta | Pasa a contar |
| --- | --- | --- | --- |
| Badge del ícono | `lib/reminders/use-app-badge.ts`, cliente | Solo recordatorios no entregados | Recordatorios + hábitos pendientes de hoy |
| Contador de Hoy | `lib/tasks/today-count.ts`, servidor | Solo tareas | Tareas + hábitos pendientes de hoy |

No se unifican en esta fase: uno corre en el cliente con `refetchInterval` y el
otro en el layout del servidor, y fusionarlos es una refactorización que excede
el alcance. Pero la definición de "pendiente de hoy" tiene que ser **una sola**,
compartida, para que los dos números no se contradigan.

> Nota aparte: el badge hoy cuenta solo recordatorios, cuando el spec ya pedía
> "tareas más hábitos". O sea que arrastra una divergencia de la fase 2 que esta
> fase corrige de paso.

## Risks / Trade-offs

**Calcular la racha en cada lectura puede volverse costoso con años de
historial** → El índice `(habit_id, completed_on desc)` y el corte en
`created_at` acotan el recorrido. El volumen de una app personal no justifica
denormalizar antes de medir un problema real. Si aparece, la salida no es una
columna: es cachear el resultado.

**La semana fija lunes-domingo va a confundir a quien tenga otra preferencia** →
Documentado en D-D y en el spec de `rachas-de-habitos`. Si genera fricción real
usándolo, es una decisión de producto para revisar en `docs/decisions.md`, no un
bug a parchear.

**Los bordes de racha son fáciles de programar mal y difíciles de ver** → Son
cuatro de los cuatro criterios de aceptación de la fase. Cada regla de D-C va
con su test, y los bordes se prueban con fechas fijas, no con `now()`.

**Tocar los dos contadores puede romper lo que ya funciona** → Ambos tienen
tests hoy. La definición compartida de "pendiente de hoy" se escribe una vez y
se testea sola, antes de enchufarla a los dos consumidores.

**El realtime puede quedar a medias, otra vez** → En la fase 2, sumar tablas a
la publicación sin suscribir el cliente dejó el realtime muerto en silencio
durante toda la fase. Acá son tres lugares: la publicación, el handler y
`REALTIME_TABLES`. Se verifica con dos pestañas abiertas, no con tests.

**El gate en verde no prueba nada** → Cada tanda se verifica en el navegador. En
este proyecto todos los bugs reales aparecieron ahí.

## Migration Plan

1. Una migración por tabla, cada una con su RLS en el mismo archivo: `habits`,
   `habit_completions`, `habit_schedule_overrides`.
2. Índice `(habit_id, completed_on desc)` y los checks de `frequency_type`.
3. La función de cálculo de racha, `SECURITY INVOKER`.
4. Publicación de realtime: `habits` y `habit_completions`.
5. `pnpm db:types:local` — nunca `db:types`, que apunta al proyecto remoto.
6. Push a producción recién con la fase verificada.

Calificar con su esquema todo objeto que no esté en `public` o `pg_catalog`: el
`search_path` del rol que corre migraciones en Supabase hosteado no incluye
`extensions`, y eso ya hizo fallar un push en la fase 2.

Rollback: las tres tablas se dropean sin tocar nada existente. Los contadores
vuelven a su versión anterior revirtiendo dos archivos.

## Open Questions

- El spec no define el denominador de "cuántos de hoy se hicieron" en el
  encabezado: si es "3" o "3 de 5". Se implementa como "3 de 5", que es más
  informativo, y se corrige si al usarlo molesta.
- El spec no aclara si "mejor racha alcanzada" del encabezado incluye los
  hábitos archivados. Se incluyen: fue una racha real y archivar no la borra.
- Hoy soporta selección múltiple y va a mostrar hábitos. Los hábitos **no** son
  seleccionables — todas las acciones en lote son de tarea—, pero conviene
  verificar en el navegador que un hábito no queda atrapado en una selección por
  arrastre o por "seleccionar todas".
