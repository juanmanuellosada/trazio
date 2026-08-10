## Context

Diagnóstico y decisiones grandes ya cerrados por el dueño del producto (ver
`proposal.md`): la landing vende un tercio de lo que existe, la posición
correcta es "la app de tu vida entera" (no "para profesionales"), titular y
subtítulo ya están escritos, y la estructura de diez secciones también. Este
documento cubre el resto: todos los textos que faltaban, las tres decisiones
técnicas delicadas (preview de calendario, sección oscura, gate de
publicación) y el orden de implementación.

**Sobre el spec desactualizado.** `openspec/specs/landing-publica/spec.md`
describe una landing pre-"El editor": hero con captura de la vista Hoy,
grilla de seis funcionalidades con capturas, sección "El problema" que no
existe en el código actual. El rediseño "El editor" que sí está en
producción (comentarios `bloque 12.*` en `components/marketing/`) se hizo
sin pasar por OpenSpec, así que nunca actualizó el spec. El delta de este
change no solo agrega la estructura nueva: también corrige ese desfasaje
(ver la lista `REMOVED`/`MODIFIED` del spec delta). No es una decisión de
este change, es un hallazgo — se documenta acá para que quede explícito por
qué el diff del spec es más grande que el diff de intención.

## Goals / Non-Goals

**Goals:**
- Que la landing comunique las cuatro fases del producto, no la primera.
- Que la posición ("la app de tu vida entera", no "para profesionales") se
  lea en el titular y se sostenga en cada sección.
- Que "Lo que ya está agendado" sea un calendario real, no una descripción,
  sin arrastrar el bundle de `components/calendar/` a una página pública.
- Que la sección oscura se vea correcta sin importar el tema del sistema del
  visitante.
- Dejar todos los textos escritos y listos para implementar, en el registro
  de `.claude/rules/copy.md`.

**Non-Goals:**
- No se implementa `el-dia-que-entra` ni `que-hago-ahora` acá — son change
  aparte, en curso en paralelo. Este change solo escribe la sección de la
  landing que los presenta, con un gate de publicación explícito (ver más
  abajo).
- No se construye una sección de precios real — solo se deja prevista la
  ubicación (D-GRATIS).
- No se toca `components/tasks/`, `components/calendar/`, `lib/` ni
  `supabase/` — hay trabajo en curso ahí en paralelo. El preview de
  calendario de la landing es intencionalmente un componente nuevo y
  autocontenido, no una extensión de esos módulos.

---

## Todos los textos

Encabezados y cuerpos completos de cada sección, en español rioplatense,
sentence case, sin emojis, vocabulario fijo de `.claude/rules/copy.md`
(proyecto, sección, subtarea, Bandeja de entrada, hábito, filtro). Esto es
lo que hay que revisar antes de tocar ningún componente.

### 1. Hero

**Titular** (dado): `Tu día no entra en una lista.`

**Subtítulo** (dado): `Trazio junta lo que tenés que hacer, lo que querés
sostener y lo que ya está agendado. Y te dice si entra en las horas que te
quedan.`

Debajo, la demo interactiva del parser (`ParserDemo`, sin cambios de copy:
mismos cuatro ejemplos precargados, mismo campo "Escribí una tarea"). Debajo
de la demo, el CTA:

**CTA:** `Crear mi cuenta gratis` (sin cambios) — `Gratis. Sin tarjeta.`
debajo (sin cambios).

No se agrega un encabezado nuevo tipo "Escribís como hablás" arriba de la
demo: el subtítulo ya presenta las tres cosas que junta Trazio, y la demo se
explica sola (label + placeholder ya existentes en `ParserDemo`). Agregar un
tercer texto ahí competiría con el subtítulo en vez de reforzarlo.

### 2. CTA (banda, sin titular)

Sin cambios de copy: mismo botón `Crear mi cuenta gratis`, sin encabezado
propio (`CtaBand` ya no lleva título — no competir con lo que la rodea, regla
existente). Cambia la posición: pasa a ser la sección 2, inmediatamente
después del hero.

### 3. El problema

**H2:** `Tu día, repartido en tres lugares`

**Cuerpo:**

> Las tareas viven en una lista. Los hábitos, si los llevás en algún lado,
> viven en otra. Y lo que ya tenés agendado vive en el calendario, que casi
> nunca se abre cuando se arma la lista del día. Ninguna de las tres partes
> sabe de las otras dos, así que la única forma de saber si el día entra es
> hacerlo vos, a mano, cada vez.

Cuatro oraciones, sin exclamaciones, sin nombrar la solución todavía — el
patrón de Sunsama es "el estado viejo arriba, el nuevo abajo": acá "abajo"
son las tres secciones siguientes, no un cierre dentro de esta misma
sección. Nada de "caos", nada de bronca: describe, no dramatiza.

### 4. Lo que tenés que hacer

**H2:** `Lo que tenés que hacer, ordenado como vos quieras`

**Cuerpo:**

> Fecha, hora, duración, prioridad y etiqueta salen solas de lo que
> escribiste — es lo mismo que acabás de ver arriba. Lo demás lo ordenás
> vos: las tareas se agrupan en proyectos con secciones, anidadas hasta tres
> niveles, y una tarea se parte en subtareas sin límite.

Debajo, la **galería de transformaciones** existente (`TransformationsSection`,
seis ejemplos reales del parser) se reubica acá, como demostración de la
primera frase — ver D-HERO para por qué deja de ser una sección propia.

**Subencabezado (H3):** `Y cuando la lista crece, la filtrás igual que
escribís una tarea`

**Cuerpo:**

> Un filtro se escribe, no se arma clickeando casilleros. Combinás
> prioridad, fecha, proyecto, etiqueta y estado con `&`, `|` y `!`, y lo
> guardás para volver a usarlo cuando quieras.

Tres ejemplos de lenguaje de consulta, mismo tratamiento visual que la
galería de arriba (consulta real a la izquierda, su significado a la
derecha — sin inventar sintaxis, tomado de `docs/product-spec.md` §7):

| Consulta | Qué devuelve |
| --- | --- |
| `priority:1,2 & due:next7days` | Prioridad urgente o alta, que vence esta semana |
| `project:Trabajo & !label:espera` | Todo lo de Trabajo, menos lo que está en espera |
| `due:overdue` | Todo lo atrasado |

### 5. Lo que querés sostener

**H2:** `Lo que querés sostener, no solo lo que tenés que hacer`

**Cuerpo:**

> Un hábito no es una tarea que se repite: no vence, y no se completa una
> vez y desaparece. Elegís todos los días, cierta cantidad de veces por
> semana, o días puntuales, y Trazio lleva la cuenta: racha actual, mejor
> racha, y cuánto lo sostuviste en el último mes. Si un día no te da, lo
> salteás sin perder la racha.

Cuatro oraciones. Sin "no rompas la racha" ni ningún llamado a la
motivación — la racha se informa, no se arenga (`.claude/rules/copy.md`).

### 6. Lo que ya está agendado (fondo oscuro)

**H2:** `Lo que ya está agendado, al lado de todo lo demás`

**Cuerpo:**

> Conectás tu Google Calendar una vez y tus reuniones, turnos y eventos
> aparecen en la misma grilla que tus tareas y tus hábitos, con su hora
> real. Arrastrás una tarea a un hueco libre y queda agendada ahí. Es el
> único lugar de la landing donde se ve el día completo: lo que tenés que
> hacer, lo que querés sostener y lo que ya no depende de vos, todo en la
> misma pantalla.

Cuatro oraciones — la última cierra el círculo del subtítulo del hero
(las tres cosas, ahora juntas en una imagen). Debajo, el preview estático
del calendario (ver D-CAL) — sin leyenda aparte: los tres tipos de bloque
(tarea, hábito, evento) se distinguen por forma, como en la app real, y eso
no necesita explicación textual.

### 7. El día que entra

**H2:** `Y te dice si entra`

**Cuerpo:**

> Trazio resta lo que pediste contra las horas que te quedan en el día. Si
> sobra tiempo, lo ves. Si no entra, te avisa — sin números en rojo ni
> culpa, solo la cuenta hecha. Y si no sabés por dónde arrancar, "¿Qué hago
> ahora?" te propone una tarea que entra justo en el próximo hueco libre.

Cuatro oraciones, coherentes con D61 (`docs/decisions.md`): el número no
juzga. **Esta sección es la que bloquea el deploy** — ver Impact en
`proposal.md` y D-GATE más abajo.

### 8. Por qué es gratis

**H2:** `Por qué es gratis`

**Cuerpo (corregido por el dueño — ver D-GRATIS para el motivo):**

> No hay anuncios, no vendemos tus datos, y hoy usás la app completa, sin
> tarjeta y sin nada guardado atrás de un pago. Que sea así hoy no es una
> promesa de que lo va a ser para siempre, ni un indicio de que algo esté
> por cambiar. Gratis, sin tarjeta, sin período de prueba que se vence.

Tres oraciones. Lleva el matiz temporal explícito ("hoy", "que sea así hoy no
es una promesa...") en vez de una afirmación sin fecha — ver D-GRATIS para
por qué se corrigió la versión anterior de este texto y por qué la versión
de acá sigue envejeciendo bien sin importar qué pase con el precio más
adelante.

### 9. Preguntas directas (dos respuestas corregidas)

Se mantienen las seis preguntas. Dos respuestas cambian:

**¿Puedo compartir un proyecto con alguien?**

> No en el sentido de invitar a alguien a editar: Trazio es personal, una
> cuenta, una persona, sin equipos ni tareas asignadas a otro. Pero sí
> podés generar un enlace de lectura para un proyecto — quien lo abra lo ve,
> sin cuenta y sin poder cambiar nada.

**¿Puedo exportar mis tareas?**

> No como exportación — no hay un archivo de respaldo ni un importador —,
> pero sí podés copiar un proyecto entero como markdown al portapapeles,
> listo para pegar en una nota o un documento.

Las otras cuatro (sin internet, sin app en tiendas, sin inglés, cuánto
cuesta) quedan textualmente como están hoy.

### 10. Cierre

Sin cambios: `Empezá a organizar tu día en dos minutos.` + el mismo CTA.

---

## Decisiones

### D-HERO — La galería de transformaciones deja de ser una sección propia

El pedido enumera diez secciones (Hero, CTA, Problema, Tareas, Sostener,
Agendado, Día que entra, Gratis, Preguntas, Cierre) y solo nombra dos cosas
para sacar explícitamente: la leyenda de sintaxis y el árbol de jerarquía.
La galería de transformaciones (`TransformationsSection`, seis oraciones
reales del parser) no está en esa lista de diez ni en la lista de lo que se
va.

**Decisión:** se reubica como demostración dentro de "Lo que tenés que
hacer" (sección 4), sin encabezado propio, en vez de seguir siendo una
sección al mismo nivel que "El problema" o "Lo que querés sostener".
Razones: (1) el diagnóstico original dice explícitamente "cuatro de las
nueve secciones son sobre el parser" como problema a resolver, y dejarla
como quinta sección con nombre propio no lo resuelve, solo la reordena; (2)
sus seis ejemplos (fecha, hora, duración, prioridad, etiqueta, repetición)
son literalmente los atributos de una tarea, así que temáticamente
pertenece bajo "Lo que tenés que hacer", no es un tema aparte; (3) con diez
secciones ya nombradas en el pedido, no queda un lugar natural para un
undécimo encabezado sin desbalancear la página.

**Esto es una interpretación, no una instrucción explícita del pedido** —
queda marcado así en el reporte final para que el dueño lo confirme o lo
corrija antes de implementar. Alternativa si se prefiere mantenerla aparte:
insertarla como sección 4-bis, entre "El problema" y "Lo que tenés que
hacer", sin tocar el resto del orden.

### D-CAL — El preview del calendario es un componente nuevo, no una reutilización de `components/calendar/`

**El problema.** `components/calendar/` son ~30 archivos, todos `"use
client"`, con `@dnd-kit` para arrastrar y redimensionar, `ResizeObserver`
para medir columnas, `next-themes` para el color de evento por tema, y
tooltips de Radix. La regla del proyecto es categórica: *"La landing
(`app/(marketing)/`) es enteramente servidor. No debe haber un solo
`'use client'` ahí salvo en componentes de interacción puntual."*
(`.claude/rules/frontend.md`). El pedido del dueño coincide: *"componentes
reales renderizados en el servidor, estáticos. Nada de arrastre."*

**Alternativas consideradas:**

- **(a) Reutilizar `CalendarBlockChip` directo.** No importa `@dnd-kit`
  directamente, pero es `"use client"` (usa `useTheme`, `useId`, tooltips de
  Radix) — importarlo desde un Server Component lo convierte en una isla
  cliente nueva, violando la regla de "una sola isla cliente" y sumando
  `next-themes` + Radix Tooltip al bundle público por una tarjeta estática
  que no necesita ni hover ni tema dinámico (la sección ya fuerza un tema
  oscuro fijo, ver D-DARK).
- **(b) Envolver `TimeGrid`/`CalendarView` con las props mínimas para que no
  arrastre.** Insuficiente: son los componentes más pesados del árbol
  (`time-grid.tsx` 555 líneas, `calendar-block-chip.tsx` 671), pensados para
  25 columnas virtualizadas y gestos táctiles — apagar el arrastre no apaga
  las importaciones de `@dnd-kit/core` que usan sus hermanos
  (`draggable-timed-block.tsx`, `calendar-view.tsx`), y todos están en el
  mismo módulo cliente.
- **(c) Componente de presentación nuevo, autocontenido.** Un
  `CalendarDayPreview` propio bajo `components/marketing/`, Server Component
  puro, con datos hardcodeados (un martes cualquiera, 3-4 bloques: una
  tarea, un hábito, un evento de Google), que **imita visualmente** la
  grilla real sin importar nada de `components/calendar/`.

**Se elige (c).** Consecuencias concretas:

- **Constantes propias, no importadas.** `components/calendar/grid-metrics.ts`
  es `"use client"` (exporta también un hook con `ResizeObserver`), así que
  ni sus constantes (`HOUR_ROW_HEIGHT_PX`, `GUTTER_WIDTH_PX`) se importan
  desde ahí — se redefinen localmente, con valores propios más chicos: el
  preview no necesita replicar el paso de 15 minutos ni la altura pensada
  para arrastre táctil (`HOUR_ROW_HEIGHT_PX = 96` en la app real). Una
  ventana de horas despierta (8:00–20:00, 12 horas) alcanza para mostrar
  las tres cosas juntas sin scroll dentro de la tarjeta ni un día de 2304px
  de alto.
- **Sin línea de "ahora".** El preview usa una fecha fija de ejemplo (mismo
  patrón que `lib/landing/demo-context.ts` con `LANDING_REFERENCE_DATE`
  para el parser) — no tiene sentido una línea de hora actual que avance
  sola en una captura congelada.
- **Forma por tipo, reimplementada en unas pocas líneas.** La distinción
  tarea = caja con borde, hábito = píldora, evento = barra lateral gruesa
  (`TYPE_SHAPE_CLASS` en `calendar-block-chip.tsx`) se reproduce con tres
  clases de Tailwind locales — no vale la pena importar el archivo de 671
  líneas por tres strings.
- **Colores: sí se reutiliza, porque es dato puro, no componente.**
  `lib/validation/colors.ts` es un mapa de hex sin `"use client"` y sin
  dependencias de React — importar sus valores hex (no el módulo entero
  como componente) para pintar el proyecto/calendario de ejemplo con un
  color real de la app es seguro y gratis en bundle. Es la única
  reutilización de `lib/` que este componente hace, y es de datos, no de
  código cliente.
- **Ubicación de los datos de ejemplo.** Un archivo nuevo,
  `lib/landing/calendar-preview-data.ts` (mismo patrón que
  `lib/landing/demo-context.ts` y `lib/landing/static-parses.ts`: datos
  fijos, sin lógica de servidor, propiedad de marketing) con los 3-4 bloques
  hardcodeados. Vive en `lib/landing/`, que ya es la subcarpeta de `lib/`
  que le pertenece a la landing — no se toca ningún otro archivo de `lib/`.

**Costo aceptado:** un poco de duplicación visual (tres clases de forma,
media docena de constantes de píxeles) entre el componente real y el
preview. Se acepta a cambio de bundle cero adicional en la página pública y
cero acoplamiento con un módulo que otro trabajo está tocando en paralelo
ahora mismo. Si algún día se quiere de-duplicar, el lugar natural sería
extraer `TYPE_SHAPE_CLASS` y las constantes de grilla a un módulo
compartido sin `"use client"` — no es parte de este change.

### D-DARK — La sección oscura no depende de `.dark`

**El problema.** La landing hereda el tema del sistema completo
(`ThemeProvider attribute="class" defaultTheme="system"` en
`app/layout.tsx`): un visitante en tema claro navega toda la landing en
claro. La sección 6 tiene que verse oscura **siempre**, sea cual sea el
tema del visitante — es una decisión de contenido (mostrar cómo se ve la
app de verdad), no una preferencia de tema.

**Decisión:** la sección usa colores fijos, tomados literalmente de la
paleta `.dark` de `app/globals.css` (`--background: #0f172a`, `--surface:
#1a2436`, `--border: #2a3547`, `--text-primary: #f1f4f8`, `--text-secondary:
#94a3b8`, `--primary: #8ca3c9`), como valores arbitrarios de Tailwind
(`bg-[#0f172a] text-[#f1f4f8]`, etc.) en vez de las utilidades semánticas
(`bg-background`, `text-foreground`) que sí cambian con `.dark`. No hace
falta ninguna variable CSS nueva ni un segundo `ThemeProvider` anidado: son
los mismos oito pares ya auditados para contraste AA en `.dark`, aplicados
sin condicionar a la clase del `<html>`. Un comentario en el componente deja
explícito que el desacople es intencional, para que nadie lo "corrija" a
`bg-background` más adelante pensando que es un olvido.

**Contraste.** Como son los mismos pares hex que ya usa `.dark` en toda la
app (ya auditados AA ahí), el contraste no es una decisión nueva — se
hereda gratis. Se agrega una verificación explícita en `tasks.md` de todos
modos, porque el contexto cambia (fondo fijo en una página que puede estar
en cualquier tema alrededor).

### D-GATE — El día que entra bloquea el deploy, no la escritura del código

Mismo mecanismo que ya usa el requirement G4 (`openspec/specs/
landing-publica/spec.md`) para los textos legales: el código de la sección
puede escribirse y quedar listo para producción sin que la función exista
todavía, porque el copy es estático y no depende de ningún dato en runtime.
Lo que se bloquea es el **deploy a producción de la landing completa**, no
la tarea de implementación de esta sección en particular. El spec delta
(`specs/landing-publica/spec.md` de este change) lo escribe como
requirement SHALL, con el mismo peso que G4.

### D-GRATIS — Dónde entraría una sección de precio, el día que exista

Hoy Trazio es gratis en toda la fase 1-4 y no hay una fecha ni un modelo de
precio definido. La sección 8 ("Por qué es gratis") está escrita para ser
verdad hoy sin prometer nada sobre el futuro — ni "gratis para siempre" ni
"gratis por ahora" — así que no hay que reescribirla el día que cambie el
modelo, salvo que el motivo real deje de ser cierto.

**Corrección del dueño sobre el texto original.** La primera versión de este
cuerpo decía, sin matiz: *"no existe una versión recortada esperando atrás de
un botón de pago"*. Es cierta hoy, pero es una afirmación sin fecha — el día
que exista una suscripción, esa misma frase quedaría mintiendo, porque para
entonces sí podría haber funciones detrás de un pago. El dueño pidió agregar
el matiz temporal explícito ("hoy", más una oración aclarando que eso no es
una promesa de que va a durar para siempre) para que el texto siga siendo
cierto **el día que exista un plan pago**, sin tener que reescribirlo en ese
momento. La oración nueva evita las dos trampas: no promete que seguirá
siendo gratis para siempre (violaría el requirement "Gratis, sin plan pago ni
insinuación de cobro futuro" del spec delta en el sentido contrario) y no
insinúa un cobro que todavía no está decidido (violaría el mismo requirement
en el sentido que sí prohíbe explícitamente) — se limita a aclarar que el
estado de hoy no es, en sí mismo, una garantía sobre el futuro, sin señalar
en qué dirección podría cambiar. Texto corregido en "Todos los textos" §8 más
arriba y en `components/marketing/free-section.tsx`.

**Si algún día existe un plan pago**, el lugar natural para una sección de
precios es **entre la sección 8 ("Por qué es gratis") y la sección 9
(Preguntas directas)** — no antes: las secciones 1 a 7 son la demostración
del producto, y el precio se presenta después de haber mostrado todo, nunca
antes (mismo criterio que ya regía "no hay sección de precios en fase 1").
En ese momento, la sección 8 se reemplaza por una sección de precios real
(o conviven las dos, si sigue habiendo un plan gratuito) — no hace falta
reordenar nada más de la página. `app/(marketing)/page.tsx` queda escrito
con esa sección como un `import` más en la lista, así que insertar una
nueva entre dos existentes es un cambio de una línea, no una reestructura.

### D-STICKY — CTA fijo en móvil, sin JavaScript

Un `<div>` con `fixed inset-x-0 bottom-0` (más `env(safe-area-inset-bottom)`
para no quedar tapado por la barra del sistema en iOS), visible solo bajo
el breakpoint `sm:` (`sm:hidden`), con el mismo `CtaLink`. No necesita
detectar scroll ni ocultarse cerca de otro CTA — al ser `position: fixed`,
no compite por espacio con el resto de la página, y en una landing de diez
secciones el visitante pasa la mayor parte del scroll sin un CTA a la vista
salvo este. Cero JavaScript: es CSS puro, coherente con el resto de la
landing (G1).

## Orden de implementación

**Ola 1 — en paralelo, sin dependencias entre sí:**

- Hero fusionado con la demo (borra `hero-parser-preview.tsx`,
  `parser-demo-section.tsx`; `hero-section.tsx` embebe `ParserDemo`).
- Sección "El problema" (componente nuevo).
- Sección "Lo que querés sostener" (componente nuevo, sin dependencia de
  datos reales de hábitos — es copy estático).
- Corrección de las dos respuestas del FAQ.
- CTA fijo en móvil (componente nuevo, aislado).
- Limpieza: borrar `legend-section.tsx` y sus usos, borrar
  `public/landing/`, `scripts/seed-landing-demo.mjs`,
  `scripts/capture-landing-screenshots.mjs`, la entrada `landing:screenshots`
  de `package.json`.

**Ola 2 — depende de decisiones de Ola 1 pero no entre sí:**

- "Lo que tenés que hacer": reescritura de `product-narrative-section.tsx`
  sin el árbol + reubicación de `TransformationsSection` (sin su
  `<section>`/encabezado propio) + galería nueva de lenguaje de consulta.
  Depende de que el hero ya no use esa sección como "sección 2 del parser"
  conceptualmente, pero es independiente en código.
- "Lo que ya está agendado": `CalendarDayPreview` + `lib/landing/
  calendar-preview-data.ts` (D-CAL) + la sección oscura (D-DARK). Es el
  trabajo más grande de todo el change — conviene que sea una sola persona
  de punta a punta, no repartirlo.
- "El día que entra": solo copy + layout, sin dependencias técnicas nuevas.
- "Por qué es gratis": solo copy + layout, sin dependencias técnicas nuevas.

**Ola 3 — integración, depende de que Ola 1 y 2 estén terminadas:**

- Reensamblar `app/(marketing)/page.tsx` en el orden final de diez
  secciones.
- Reescribir `docs/landing.md` (estructura + corrección de la nota de la
  línea ~107).
- Aplicar el delta de `specs/landing-publica/spec.md` al archivar.

**Ola 4 — cierre, secuencial:**

- `pnpm lint && pnpm typecheck && pnpm test`.
- Verificar en el navegador: tema claro y oscuro (la sección 6 se ve oscura
  en los dos), viewport de teléfono (CTA fijo alcanzable, sin tapar
  contenido), Lighthouse ≥ 90 en rendimiento y accesibilidad.
- **Gate de publicación:** confirmar que `el-dia-que-entra` ya está en
  producción antes de este deploy (D-GATE). Si no lo está, todo lo demás
  puede estar terminado y mergeado a `main` — el deploy a producción
  específicamente espera.

## Risks / Trade-offs

- [D-HERO reubica la galería de transformaciones sin instrucción explícita
  del dueño] → marcado como interpretación en el reporte final; si el dueño
  la prefiere como sección propia, es un cambio de layout de una sección,
  no de contenido — el texto de los seis ejemplos no cambia.
- [D-CAL duplica un puñado de constantes visuales entre el preview y
  `components/calendar/` real] → aceptado a cambio de bundle público
  intacto y cero acoplamiento con un módulo en desarrollo activo paralelo;
  ver "Costo aceptado" en D-CAL.
- [El gate de D-GATE puede demorar el deploy de todo el resto del rediseño
  si `el-dia-que-entra` se atrasa] → aceptado explícitamente por el dueño en
  el pedido original ("la landing no se publica antes que esa función"); la
  mitigación es que el código puede mergearse a `main` igual, solo el
  deploy a producción espera.
- [La sección "Por qué es gratis" no menciona el futuro] → intencional
  (D-GRATIS); el riesgo es que alguien la lea como promesa de "gratis para
  siempre", que tampoco se dice. Se acepta la ambigüedad porque es la única
  forma de que el texto no requiera reescritura cuando cambie el modelo de
  precio, sea cual sea el cambio.
