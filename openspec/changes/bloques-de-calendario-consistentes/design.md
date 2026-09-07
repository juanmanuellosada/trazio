## Context

La grilla del calendario dibuja los tres tipos de bloque con un único componente,
`components/calendar/calendar-block-chip.tsx`, que elige la forma con un mapa por
tipo:

```ts
task:  "rounded-md border-2"
habit: "rounded-full border"
event: "rounded-md border-y border-r border-l-4"
```

La intención era buena y está escrita en el spec: distinguir los tipos por forma y
no por color, porque el color ya lo ocupa el proyecto, la etiqueta o el calendario de
origen. El problema es el canal elegido para el hábito. `rounded-full` no es un
radio: es "la mitad de lo que midas". Y el alto de un bloque sale de su duración
(`(minutos / 60) × HOUR_ROW_HEIGHT_PX`, con `HOUR_ROW_HEIGHT_PX = 96`), sin
`min-height`. Medido en el navegador sobre la base real:

| Duración | Alto | Radio efectivo | Cómo se lee |
| --- | --- | --- | --- |
| 10 min | 14px | 7px | píldora, correcta |
| 45 min | 70px | 35px | cápsula deformada |
| 2 h | 192px | 96px | óvalo |

La duración terminó siendo un canal visual que nadie eligió: el mismo hábito comunica
cosas distintas según cuánto dure, y ninguna de ellas es intencional.

En paralelo, el control de completar está escrito cinco veces. En el calendario es un
círculo de 12px envuelto en un botón de 24×24 (`-inset-1.5`), con el borde teñido del
color del bloque. En las listas el botón **es** el círculo: `size-4`, 16×16, sin área
extendida, con `border-input`. Es decir que la versión de las listas queda por debajo
del mínimo de 24×24 de WCAG 2.5.8, y la del calendario —la que parecía el caso
apretado— es la única que lo cumple.

## Goals / Non-Goals

**Goals:**

- Que la forma de un bloque no dependa de su duración.
- Mover la distinción entre tipos del radio al borde, sin debilitarla.
- Un único control de completar, con dos tamaños y el color del borde sin marcar como
  decisión de quien lo usa.
- Cerrar de paso el agujero de área tocable de las listas.

**Non-Goals:**

- La manija de redimensionar, hoy visible al 40% de forma permanente en el borde
  inferior de cada bloque.
- El hábito cuyo emoji es un ✅ y se lee como un segundo control al lado del círculo.
- Tocar la paleta, la tipografía o la escala de espaciado.
- Cambiar la escalera de contenido por alto ni el modo apretado: se conservan tal
  como están.

## Decisions

### El radio de todos los bloques es `rounded-md` (6px)

Alternativas consideradas:

- **Limitar el radio del hábito a un tope.** CSS resuelve `border-radius` en
  porcentaje contra las dos dimensiones, así que un tope real exige calcular el radio
  en JavaScript a partir del alto medido. Introduce una lectura de layout por bloque
  para un efecto decorativo: no vale el precio.
- **Dar al hábito un radio fijo mayor que el de la tarea** (12px contra 6px). Es
  estable y conserva un eco de la píldora, pero agrega un tercer valor de radio a un
  sistema que ya define cuatro, y la diferencia entre 6 y 12px a este tamaño se lee
  como un descuido antes que como una señal.
- **Elegida: un solo radio para todos.** `rounded-md` (6px) es exactamente el valor
  que la tarea ya usa, así que ningún bloque de tarea cambia de aspecto: el hábito se
  mueve hacia la tarea, no al revés. El hábito deja de tener forma propia y pasa a
  distinguirse por el borde.

  Salvedad encontrada al implementar: 6px **no es** ninguno de los cuatro tokens de
  radio del proyecto (`--radius-sm` 4px, `--radius` 8px, `--radius-lg` 12px,
  `--radius-full`). `--radius-md` no está definido en `app/globals.css`, así que
  `rounded-md` cae al default de Tailwind. Los bloques de tarea ya venían usándolo
  desde antes de este cambio. Es una deriva real entre la tabla de radios y el código,
  pero resolverla —definir `--radius-md`, o mover los bloques a `--radius-sm` y
  aceptar que las tareas pasen de 6px a 4px— cambia cómo se ven las tareas y es una
  decisión aparte. Acá se conserva el 6px existente y la deriva queda documentada.

`docs/design-system.md` reserva `--radius-full` para "chips de prioridad/etiqueta,
avatar". El uso actual en el hábito ya estaba fuera de esa tabla; esto lo alinea con
lo que hace la tarea, aunque —como dice la salvedad— el valor común tampoco esté en
la tabla todavía.

### La distinción por tipo se sostiene en tres canales, no en uno

Bajar el radio del hábito le saca un canal. Para que la regla de accesibilidad
—no distinguir solo por color— siga en pie, conviene enumerar qué queda:

| Tipo | Borde | Marcador propio | Control de completar |
| --- | --- | --- | --- |
| Tarea | 2px parejo | — | sí |
| Hábito | 1px parejo | emoji, obligatorio en el dominio | sí |
| Evento | barra izquierda 4px | ícono de calendario | no |

El borde solo no alcanzaría: 1px contra 2px es una diferencia sutil, y en una pantalla
densa se pierde. Lo que sostiene la distinción es la suma. La tarea y el hábito se
separan por el emoji, que el dominio garantiza que existe. El evento se separa de los
dos por la barra lateral y por la ausencia del círculo. Por eso el spec pide
explícitamente que cada tipo conserve un marcador que no sea ni color ni borde: si
mañana alguien hace opcional el emoji del hábito, el spec falla antes que la vista.

### El control compartido vive en `components/ui/`

Es una primitiva de interfaz sin lógica de dominio, y `components/ui/` es donde el
proyecto ya pone las primitivas construidas sobre shadcn/ui. No hay un componente
`checkbox` de shadcn instalado y no conviene traerlo: este control es un círculo con
un punto, no una casilla, y su comportamiento —incluida la variante que dispara el
sonido al completar— ya está resuelto en las llamadas existentes.

La primitiva se queda solo con lo visual y lo accesible: el círculo, el punto interno,
el área tocable, el rol y el estado. Quién decide qué pasa al hacer clic, cómo se
etiqueta y si el evento se detiene antes de propagar al bloque sigue siendo del que
la usa. En el calendario eso importa: el control convive con un gesto de arrastre y
necesita frenar el `pointerdown` antes de que el bloque lo tome.

La escala tiene cuatro tamaños, no dos. El relevamiento del código —hecho después de
escribir el primer borrador de este documento— encontró cuatro valores en uso:

| Superficie | Círculo | Punto | Área tocable hoy |
| --- | --- | --- | --- |
| Bloque del calendario | 12px | 4px | 24×24 |
| Fila de tarea | 16px | 6px | 16×16 |
| Fila de hábito de hoy | 16px | 6px | 16×16 |
| Detalle de tarea | 20px | 8px | 20×20 |
| Tarjeta de hábito | 24px | 8px | 24×24 |

La primitiva los soporta a los cuatro y cada superficie conserva el tamaño que tiene
hoy. Colapsar la escala a dos o tres valores es una decisión de diseño con
consecuencias visibles en el detalle de tarea y en la tarjeta de hábito, y no
corresponde colarla adentro de un refactor: si se quiere, se propone aparte.
Lo único que cambia para el usuario en este cambio es el área tocable de las tres
superficies que hoy están por debajo del piso de 24×24.

El tamaño más chico existe por una razón medible y no por gusto: un hábito de diez
minutos ocupa 14px de alto, y un círculo de 16px no entra.

El color del borde sin marcar entra como propiedad, no como valor por defecto. Las dos
variantes que hoy existen son deliberadas —en el calendario el control es parte del
bloque y toma su color; en una lista no hay bloque del que ser parte— y unificarlas
sería perder información. Lo que se unifica es el estado marcado, que hoy ya coincide
en las cinco copias.

### El orden del trabajo

Primero la primitiva y la migración de las cinco superficies, después el radio. Al
revés, el cambio de radio quedaría mezclado en el mismo diff que la migración del
control y sería más difícil de revisar y de revertir por separado.

## Risks / Trade-offs

- **El hábito pierde su forma más reconocible.** → Era reconocible solo en las
  duraciones cortas; en 45 minutos ya no comunicaba "hábito" sino "algo raro". El
  emoji, que está en todos los hábitos por regla del dominio, es un marcador más
  estable que un radio que cambia solo.

- **1px contra 2px es una diferencia sutil, y en modo oscuro con colores de baja
  saturación puede perderse.** → Es la razón por la que el spec exige un marcador no
  cromático por tipo además del borde. Vale mirarlo en el navegador con un hábito y
  una tarea del mismo color antes de dar el cambio por cerrado; el gate en verde no
  cubre esto.

- **Cinco superficies migradas de una vez.** → Son cinco diffs mecánicos y cada una
  tiene tests. El riesgo real no es romper el render sino perder por el camino algún
  detalle de comportamiento que hoy vive inline: `tabIndex={cursor ? -1 : undefined}`
  en la fila de tarea, el freno del `pointerdown` en el calendario. Cada migración
  tiene que revisar qué le pasaba al `<button>` que reemplaza, no solo cómo se veía.

- **Cambiar el área tocable de las listas a 24×24 puede pisar lo de al lado.** → En la
  fila de tarea el control tiene vecinos cerca. El área crece hacia afuera del flujo,
  igual que en el calendario, así que no debería mover nada; hay que confirmarlo
  mirando la fila, no asumiéndolo.

- **`calendar-block-chip.test.tsx` afirma hoy `size-3` y `-inset-1.5` como clases
  literales.** → Van a fallar y está bien que fallen: son exactamente el contrato que
  se está mudando. Hay que actualizarlas para que apunten a la primitiva, no
  borrarlas.

## Migration Plan

Es un cambio de presentación: sin migración de datos, sin cambios de esquema, sin
banderas. Se despliega con el código y se revierte revirtiendo el commit.

## Open Questions

- ¿El bloque de la fila de todo el día —hoy `h-6`, 24px— entra cómodo con el control
  en tamaño `md`, o le conviene el `sm` como a los bloques apretados de la grilla? Se
  decide mirándolo, no antes.


## Apéndice: correcciones al relevamiento inicial

Dos datos del borrador original resultaron falsos al mirar el código, y quedan
anotados acá porque cambiaron el alcance:

- **No son dos tamaños de control, son cuatro.** Ver la tabla más arriba. La primitiva
  los soporta a los cuatro en vez de forzar una escala nueva.
- **`components/public/public-task-row.tsx` no tiene este control y no se migra.** Usa
  los íconos `Circle` / `CheckCircle2` de Lucide, no es interactivo porque el enlace de
  lectura no permite completar, y ya trae un comentario que explica por qué se aparta
  de `task-row.tsx` a propósito. Las superficies a migrar son cinco, no seis.

También quedaron descartadas dos coincidencias de la búsqueda que usan las mismas
clases sin ser este control: `components/projects/color-swatch-picker.tsx` y
`components/settings/calendar-form-dialog.tsx:170` son muestras de color.
