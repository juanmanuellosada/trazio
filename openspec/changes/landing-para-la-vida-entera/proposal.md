## Why

Trazio terminó sus cuatro fases y la landing sigue vendiendo la de fase 1.
`app/(marketing)/page.tsx` de hoy tiene ocho secciones (la de "Lo que viene"
ya se sacó en `landing-al-dia`) y **no menciona**: el calendario con bloques
de tiempo, Google Calendar, los hábitos con racha, el lenguaje de consulta,
el modo panel, la paleta de comandos, el enlace de lectura ni el buscador.
Cuatro de las ocho secciones existentes son sobre el parser (hero congelado,
demo, leyenda de sintaxis, galería de transformaciones). El titular promete
*"para el día entero"* y la página nunca lo entrega.

**La posición que ordena todo.** Se relevaron nueve competidores sobre su
HTML real. Los cinco que combinan tareas con calendario venden trabajo, sin
excepción: Sunsama a *"modern professionals"*, Akiflow a *"founders,
operators, and obsessed doers"*, Reclaim es *"#1 AI calendar for work"*.
Ninguno de los nueve tiene hueco para pagar el gas o cortar el pasto.
**Trazio es el único que junta tareas, hábitos con racha y calendario con
bloques de tiempo** — TickTick tiene hábitos con racha pero no bloques
reales; Reclaim agenda hábitos como bloques pero sin racha ni constancia.
Ninguno tiene las dos cosas. Y ninguno de los nueve tiene landing en español
rioplatense. Trazio no es una app de productividad para profesionales: es la
app de tu vida entera. Eso es lo que la landing tiene que decir.

**Otros dos defectos puntuales, ya diagnosticados y ya resueltos por otras
decisiones:**

- El FAQ tiene dos respuestas vencidas: dice que no se puede compartir un
  proyecto (existe el enlace de lectura, D59) y que no se puede exportar
  (existe copiar como markdown, D60). Las dos suenan más restrictivas de lo
  que el producto es.
- `docs/landing.md`, alrededor de la línea 107, tiene una nota que instruye
  comunicar "tareas, hábitos y calendario en la misma línea de tiempo" *"como
  lo que viene, no como lo que hay"* porque *"recién existe en fase 3-4"*.
  Con las cuatro fases en producción la nota quedó al revés: hoy haría
  subvender el producto en vez de protegerlo de sobrevenderlo.

**Nota sobre el spec vigente.** `openspec/specs/landing-publica/spec.md`
describe una landing que ya no existe: hero con "captura real de la vista
Hoy", una "grilla de Funcionalidades" de seis bloques con capturas, y una
sección "El problema" que no está en `app/(marketing)/page.tsx` actual. El
rediseño "El editor" (comentarios `bloque 12.*` en el código: hero sin
imagen, demo interactiva, leyenda de sintaxis, galería de transformaciones)
se implementó en algún momento **sin pasar por OpenSpec**, así que el spec
nunca se actualizó — quedó describiendo la versión anterior a esa. Este
change no solo agrega lo nuevo: también pone el spec al día con lo que el
código ya hace hoy, en el mismo delta. Se deja como hallazgo, no como algo
que se re-litigue acá.

## What Changes

- **Hero fusionado con la demo.** El campo del parser deja de aparecer
  congelado arriba y repetido interactivo una sección más abajo: la demo
  interactiva (`ParserDemo`) se muestra desde el primer scroll, dentro del
  hero. Titular nuevo: *"Tu día no entra en una lista."* Subtítulo nuevo:
  *"Trazio junta lo que tenés que hacer, lo que querés sostener y lo que ya
  está agendado. Y te dice si entra en las horas que te quedan."`
- **CTA se adelanta.** La banda de CTA pasa a estar inmediatamente después
  del hero (hoy está dos secciones más abajo), justo después de que la
  persona jugó con la demo — el pico de intención.
- **Tres secciones nuevas que son la estructura del subtítulo:** "Lo que
  querés sostener" (hábitos con racha y constancia) y "Lo que ya está
  agendado" (calendario con bloques reales y Google Calendar, en fondo
  oscuro) se suman a una reescrita "Lo que tenés que hacer" (tareas,
  subtareas, proyectos, secciones, y el lenguaje de consulta, que hoy no se
  menciona en ningún lado de la landing).
- **"El problema" vuelve**, con contenido nuevo: el estado sin sistema
  (tareas, hábitos y calendario en lugares que no se hablan entre sí),
  descrito sin dramatismo, en el registro de Trazio.
- **"El día que entra"**, nueva: la resta entre lo pedido y las horas que
  quedan. **Depende de una función que se está construyendo en paralelo**
  (`el-dia-que-entra`, todavía no en producción) — ver Impact y Design para
  el gate de publicación.
- **"Por qué es gratis"**, nueva: hoy la landing repite "gratis, sin tarjeta"
  tres veces sin decir por qué, que es justo lo que genera la duda.
- **Dos respuestas del FAQ corregidas** (D59, D60): compartir vía enlace de
  lectura, copiar como markdown en vez de exportar.
- **Se van:** la leyenda de sintaxis de ocho filas (dice "ocho tipos de
  dato" cuando son siete — "fecha relativa" y "fecha puntual" comparten
  color — y el color ya se explica solo, interactuando con la demo) y el
  árbol de jerarquía de proyectos anidados (cualquier competidor lo tiene;
  no es un diferencial).
- **CTA fijo en móvil**, alcanzable con el pulgar y visible al scrollear —
  pedido en `docs/landing.md` desde antes, nunca implementado.
- **Se borra `public/landing/`**: siete capturas huérfanas de fase 1, sin
  ninguna referencia en el código (verificado con grep), que además
  contradicen la regla de cero imágenes que el resto de la landing ya
  respeta. Con ellas se van los dos scripts que solo existen para
  regenerarlas (`scripts/seed-landing-demo.mjs`,
  `scripts/capture-landing-screenshots.mjs`) y la entrada
  `landing:screenshots` de `package.json` — hallazgo de este change, no
  pedido explícitamente, pero directamente huérfano de borrar las capturas.
- **`docs/landing.md` se reescribe** para describir la estructura nueva y
  corregir la nota de la línea ~107 sobre "fase 3-4".
- **El spec de `landing-publica` se pone al día** con lo que el código hace
  hoy y con lo que este change agrega — ver "Nota sobre el spec vigente"
  arriba.

## Capabilities

### Modified Capabilities

- `landing-publica`: reescribe la mayoría de los requirements — la
  estructura de la página, el contenido de cada sección, el gate de
  publicación de "El día que entra", y la actualización de los dos
  requirements que estaban desactualizados desde antes de este change (ver
  spec delta para el detalle línea por línea).

## Impact

**Solo `app/(marketing)/` y documentación** — sin migración, sin cambio de
esquema, sin RLS. Ningún archivo de `components/tasks/`, `components/
calendar/`, `lib/` ni `supabase/` se toca desde este change (hay otro
trabajo en curso ahí); la sección de calendario de la landing es un
componente nuevo y autocontenido, no una reutilización de
`components/calendar/` — ver Design para la razón.

- `components/marketing/` — reescritura mayor: `hero-section.tsx` absorbe
  la demo, se borran `hero-parser-preview.tsx`, `parser-demo-section.tsx` y
  `legend-section.tsx`, `product-narrative-section.tsx` se reescribe sin el
  árbol, `faq-section.tsx` corrige dos respuestas, y se suman componentes
  nuevos para "El problema", "Lo que querés sostener", "Lo que ya está
  agendado" (con su preview de calendario), "El día que entra", "Por qué es
  gratis" y el CTA fijo de móvil.
- `app/(marketing)/page.tsx` — nuevo orden de secciones.
- `public/landing/` — se borra entero (7 imágenes + README).
- `scripts/seed-landing-demo.mjs`, `scripts/capture-landing-screenshots.mjs`
  — se borran (huérfanos de `public/landing/`).
- `package.json` — se quita el script `landing:screenshots`.
- `docs/landing.md` — reescritura de la sección "Estructura" y corrección de
  la nota de la línea ~107.
- `openspec/specs/landing-publica/spec.md` (vía delta de este change).

**Gate de publicación — el más importante de este change:** la landing
**no se despliega a producción** hasta que `el-dia-que-entra` esté en
producción. Publicar antes prometería, en el subtítulo del hero, una
función que no existe. El código de la sección "El día que entra" puede
escribirse y quedar listo — es texto estático, no depende de la función en
tiempo de build —, pero el deploy completo queda bloqueado hasta entonces,
igual que ya se bloquea el deploy sin el texto legal definitivo (G4).

**Fuera de alcance:**

- Implementar `el-dia-que-entra` o `que-hago-ahora` — son change aparte, en
  curso.
- Tocar `components/tasks/`, `components/calendar/`, `lib/` o `supabase/`
  más allá de lectura para diseñar el preview estático del calendario.
- Agregar una sección de precios real — se deja prevista la ubicación en
  Design, no se construye.
- Cambiar el contenido de la galería de transformaciones del parser (los
  seis ejemplos existentes) — se reubica, no se reescribe.
