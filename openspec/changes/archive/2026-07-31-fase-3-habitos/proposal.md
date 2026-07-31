## Why

Trazio hoy sirve para lo que hay que terminar. No sirve para lo que querés
sostener. Un hábito no se completa: se repite, y lo único que importa es no
cortar la cadena — pero la aplicación no tiene forma de representar eso. Una
tarea recurrente se le parece y no alcanza: no lleva racha, no distingue "tres
veces por semana", y completarla la borra de la vista en vez de dejar constancia.

Las fases 1 y 2 dejaron los enchufes puestos y vacíos: el badge cuenta solo
recordatorios, el acorde `G A` está reconocido pero no navega a ningún lado, y
la barra de opciones guarda una clave `showHabits` que ningún control muestra.
Esta fase los enciende.

## What Changes

**El hábito como entidad propia**

- Nombre, ícono emoji, color de la paleta fija, duración estimada y hora
  programada opcional — sin hora es "todo el día".
- Tres formas de repetirse: todos los días, N veces por semana, o días
  específicos de la semana.
- Un hábito no tiene proyecto, sección, etiquetas, subtareas, prioridad,
  comentarios ni recordatorios. **No se termina: se archiva.**
- Nunca aparece en fechas anteriores a su creación.

**Marcado y rachas**

- Marcar y desmarcar el hábito del día, desde Hoy y desde la pantalla propia.
  Los días pasados **no** se pueden corregir: el mini-mapa es de solo lectura.
- Racha actual y mejor racha, **calculadas en cada lectura**, nunca guardadas
  como columna. Lo exige D10 y el roadmap lo repite como criterio de aceptación.
- El día en curso tiene margen de gracia: hoy sin marcar no corta la racha hasta
  que el día termina.
- Para "N veces por semana", la semana va de **lunes a domingo fijo** y la
  semana en curso no entra en la racha hasta que cierra: se muestra aparte como
  progreso, "1 de 3".
- Desarchivar devuelve el historial intacto, pero la racha actual arranca en
  cero: el período archivado la cortó.

**La pantalla Hábitos**

- Encabezado con tres números: hábitos activos, mejor racha alcanzada, y
  cuántos de hoy se hicieron.
- Hábitos agrupados por forma de repetirse, cada uno con su mini-mapa de los
  últimos 14 días, su racha actual o progreso semanal, y su mejor marca.
- Sección desplegable con los archivados.
- Reprogramar el horario de un día puntual sin tocar el horario habitual.

**Integración con lo que ya existe**

- Bloque de hábitos del día en la vista Hoy, con contador de cuántos se hicieron.
- **Los dos contadores pasan a sumar hábitos**: el badge del ícono y el
  contador de Hoy del panel lateral. Son dos caminos de código independientes.
- El acorde `G A` navega a `/habitos`. El acceso "Hábitos" aparece en el panel
  lateral. El control "mostrar hábitos" se expone en la barra de opciones.

Nada de esto es **BREAKING**: son capacidades nuevas sobre contratos existentes.
Lo que sí cambia de comportamiento observable es que los dos contadores empiezan
a incluir hábitos, así que el número que ves hoy va a subir.

## Capabilities

### New Capabilities

- `habitos`: la entidad, su CRUD, el marcado y desmarcado, archivar y
  desarchivar, y la reprogramación puntual del horario.
- `rachas-de-habitos`: el cálculo de racha actual y mejor racha para los tres
  tipos de frecuencia, con sus bordes — día en curso, semana en curso, semana de
  creación, y período archivado.
- `pantalla-habitos`: la vista propia, sus estadísticas de encabezado, la
  agrupación por frecuencia, el mini-mapa de 14 días y los archivados.

### Modified Capabilities

- `esquema-datos`: cae el requisito que prohíbe que existan `habits`,
  `habit_completions` y `habit_schedule_overrides`; se crean las tres con su RLS
  y la función de cálculo de racha.
- `sincronizacion-tiempo-real`: `habits` y `habit_completions` entran en la
  replicación. `habit_schedule_overrides` queda afuera, como fija el data model.
- `vistas-lista`: Hoy suma el bloque de hábitos del día, y el contador de
  pendientes deja de contar solo tareas.
- `recordatorios-push`: el badge del ícono pasa a sumar los hábitos pendientes
  de hoy además de los recordatorios.
- `atajos-de-teclado`: `G A` deja de ser un destino sin ruta y navega a
  `/habitos`.
- `opciones-de-vista`: el control "mostrar hábitos", hoy reservado en el esquema
  sin exponerse, aparece en la barra.

## Impact

**Esquema.** Tres tablas nuevas, exactamente las que `docs/data-model.md` ya
especifica y con esos nombres: `habits`, `habit_completions` y
`habit_schedule_overrides`. Las tres llevan `user_id` propio, porque D11 exige
que la política de RLS sea una sola comparación sin joins. Índice
`(habit_id, completed_on desc)`, que es lo que abarata el cálculo de racha. Una
función `SECURITY INVOKER` que devuelve racha actual y mejor racha.

**Código.** Ruta nueva `app/(app)/habitos/`, ya prevista en la estructura de
`AGENTS.md` pero inexistente. Módulo `lib/habits/`. Se tocan
`lib/reminders/use-app-badge.ts` y `lib/tasks/today-count.ts` — los dos
contadores—, `lib/shortcuts/chord.ts` para darle ruta al acorde,
`lib/view-options/schema.ts` para exponer `showHabits`,
`components/layout/sidebar-content.tsx` para el acceso, y
`lib/realtime/subscribe.ts` para las dos tablas replicadas.

**Dependencias.** Ninguna nueva. El selector de emoji y el de color de la paleta
fija ya existen desde las fases 1 y 2.

**Fuera de alcance.** Todo lo de calendario es fase 4: arrastrar un hábito para
cambiarle el horario, los chips de hábitos sin hora, y cualquier integración con
Google. Los hábitos tampoco entran en el buscador, en el lenguaje de filtros, en
la selección múltiple ni tienen recordatorios propios — el spec los excluye de
todo eso.
