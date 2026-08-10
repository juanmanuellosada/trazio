# Trazio — Landing page

Especificación de la página pública. Entra en la fase 1.

---

## Por qué esta versión reemplaza a la anterior

La primera versión de esta landing seguía el patrón por defecto de SaaS: hero
con captura arriba del pliegue, prueba social reemplazada por la demo del
parser en la sección 2, grilla de seis funcionalidades, cierre. Funcionaba,
pero el dueño del producto la mandó a rediseñar después de investigar cómo lo
resuelven Linear, Raycast, Sunsama, Todoist y otros. Tres hallazgos, todos
medibles:

1. **La grilla de seis tarjetas iguales es el patrón más flojo que existe.**
   Le da el mismo peso a seis cosas de importancia muy distinta, y el
   visitante concluye correctamente que ninguna importa. Linear tiene una
   grilla, pero en una página secundaria: en la home nunca. La grilla es
   navegación, no persuasión.
2. **El diferencial estaba enterrado.** Todoist y Fantastical, los dos únicos
   productos con parser de lenguaje natural, lo subvenden: uno solo lo
   describe con texto, el otro lo mete como sección 4 de 20 con una
   ilustración estática. La versión anterior de esta landing tenía la demo
   funcionando, pero en la sección dos, con el mismo peso que el resto.
3. **La escala tipográfica era la causa medible de que se viera básica.** El
   titular topaba en 40px contra cuerpo de 16px: relación de 2,5×. Linear,
   Raycast y Craft corren 56-80px contra 16-18px, relación de 4× a 5×. El
   titular no tenía autoridad, y arreglarlo no cuesta nada en bytes — ver
   `docs/design-system.md` §4.1.

**La dirección nueva, "El editor":** el parser deja de ser una sección y pasa
a ser el esqueleto de toda la página. Consecuencia directa de los tres
hallazgos:

- La grilla de seis funcionalidades se reemplaza por la **galería de
  transformaciones** (sección 4): seis oraciones reales, cada una mostrando
  una capacidad distinta del parser en vez de describirla. Sigue habiendo
  seis bloques, pero ahora demuestran en vez de listar.
- El parser pasa de ser la sección 2 a ser el **elemento visual del hero**
  (sección 1): sin captura de pantalla, el campo del parser —congelado,
  resaltado, con cursor— es lo primero que ve el visitante.
- Se suma una sección de **preguntas directas** (sección 6, estilo Basecamp)
  que no existía: Trazio no tiene usuarios todavía, y alguien evaluando una
  app sin usuarios va a tener preguntas sobre sus límites. Contestarlas de
  frente —sin conexión, sin compartir, sin tienda de apps— convierte una
  restricción en prueba de que el producto sabe lo que es.

Lo que sigue describe la versión nueva. El resto de esta sección conserva la
evidencia de investigación original: sigue siendo válida, es la base sobre la
que se construyó "El editor".

Lo que sostiene la evidencia original:

- La estructura de las que convierten es notablemente consistente: **titular
  orientado al resultado, CTA arriba del pliegue, prueba social, features
  escaneables, y cierre con CTA**. Cada sección responde una pregunta del visitante,
  en el orden en que se la hace.
- **Un solo CTA principal — pero puede repetirse.** Las páginas con un solo CTA
  *distinto* (un mensaje, un destino, un texto) convierten alrededor de 13,5%
  frente a 10,5% de las que tienen cinco o más. Esa comparación es entre CTA que
  compiten entre sí en la misma página ("empezá gratis" vs. "ver demo" vs. "hablar
  con ventas"), no entre repetir el mismo CTA en varios puntos del scroll. Repetir
  el texto y el destino exactos del único CTA principal en distintos puntos de la
  página no viola este principio — lo aplica correctamente: sigue siendo un solo
  mensaje, solo que alcanzable sin volver a subir. Las opciones secundarias (si
  las hubiera) aparecen más abajo, cuando el visitante ya tiene contexto.
- **Mostrar el producto, no describirlo.** "El editor" lleva esto un paso más
  allá que la versión original: en vez de una captura anotada, el producto
  funcionando en vivo (o congelado, en el hero) arriba del pliegue.
- El visitante decide en unos cinco segundos si sigue leyendo.
- **Cerca del 79% del tráfico a landings de SaaS llega desde el teléfono**, aunque
  el escritorio convierta mejor. La experiencia móvil define si esa persona vuelve.
- Cuando el producto entrega valor en menos de diez minutos, el CTA principal debe
  ser registrarse, no pedir una demo. Trazio entrega valor en dos minutos.

Un ajuste propio: casi toda la literatura asume que existe prueba social. Trazio
todavía no tiene usuarios. La solución no es inventar testimonios sino **reemplazar
esa sección por prueba de producto** — el parser funcionando, en vivo, y una
galería de transformaciones reales.

---

## Objetivo

Una sola conversión: **crear una cuenta**. Sin newsletter, sin "hablá con ventas",
sin descarga de nada.

## Público

Alguien en Argentina que ya usa (o abandonó) un gestor de tareas y siente que las
opciones existentes son o demasiado pesadas o demasiado pobres. Habla español, y le
molesta que las apps que usa piensen en inglés.

## Posicionamiento

**Tu día completo en una sola pantalla.**

Lo que hay que hacer, lo que querés sostener y lo que ya está agendado, juntos. No
"otra lista de tareas".

Los dos diferenciales que se comunican:

1. **Escribís como hablás.** El alta rápida entiende español de verdad — "reunión
   con Ana el próximo martes a las 3pm por 45min" se convierte en una tarea con
   fecha, hora y duración, sin tocar un solo campo.
2. **Tareas, hábitos y calendario en la misma línea de tiempo.** No tres apps
   pegadas con cinta.

> Nota interna (corregida en `landing-para-la-vida-entera`): esta nota decía
> que el segundo diferencial "recién existe en la fase 3-4" y que había que
> comunicarlo "como lo que viene, no como lo que hay". Las cuatro fases están
> en producción desde antes de este change — la nota había quedado al revés:
> hoy diría que hay que subvender un producto que ya existe, en vez de
> protegerlo de sobrevenderlo. Comunicar los dos diferenciales como lo que
> la app hace, sin condicional ni "próximamente".

---

## Estructura

Reescrita entera en `landing-para-la-vida-entera`: la versión anterior tenía
ocho secciones y cuatro de ellas eran sobre el parser (hero congelado, demo,
leyenda de sintaxis, galería), sin mencionar el calendario con bloques de
tiempo, los hábitos con racha, el lenguaje de consulta ni la resta entre lo
pedido y las horas que quedan — un tercio del producto. La estructura nueva
tiene diez secciones, en el orden en que el subtítulo del hero promete las
tres cosas que junta Trazio y después las entrega, una por una, antes de
hablar de precio o de preguntas. Detalle completo de cada texto y cada
decisión técnica en `openspec/changes/landing-para-la-vida-entera/design.md`
("Todos los textos" y las decisiones `D-*`); acá va el resumen de qué es cada
sección y por qué está en ese lugar.

### 1. Hero

La demo interactiva del parser (`ParserDemo`) es el elemento visual
principal **desde el primer render** — ya no hay un campo congelado arriba
(existía como `HeroParserPreview`, borrado) y la demo interactiva repetida
una sección más abajo (`ParserDemoSection`, borrada): las dos se fusionaron
en una sola. Tres elementos, en este orden:

- **Titular** — el resultado, no la funcionalidad: *"Tu día no entra en una
  lista."* En la escala tipográfica exclusiva de la landing
  (`text-landing-hero`, `docs/design-system.md` §4.1).
- **Subtítulo** — nombra las tres cosas que junta Trazio: *"Trazio junta lo
  que tenés que hacer, lo que querés sostener y lo que ya está agendado. Y
  te dice si entra en las horas que te quedan."* Es la estructura de las
  seis secciones que siguen: 3, 4, 5 y 6 son, en orden, esas tres cosas más
  la resta final.
- **La demo del parser, interactiva** — mismo componente que antes vivía en
  la sección 2, ahora arriba de todo. Su estado inicial ya viene parseado
  (calculado en el primer render), así que se lee incluso antes de que el
  JavaScript termine de hidratar.

**CTA principal** — "Crear mi cuenta gratis", con *"Gratis. Sin tarjeta."*
debajo. Sin menú de navegación con links que se lleven al visitante afuera.
Como mucho, el logo a la izquierda y un "Iniciar sesión" discreto a la
derecha.

### 2. El problema

Nueva. Describe, sin dramatismo, el estado sin sistema único: las tareas en
una lista, los hábitos en otro lado si acaso, el calendario que casi nunca
se abre cuando se arma el día — ninguna de las tres partes sabe de las
otras dos. No nombra la solución todavía: la muestran las tres secciones que
siguen.

### 3. Lo que tenés que hacer

Fecha, hora, duración, prioridad y etiqueta salen solas de lo que se
escribió; las tareas se agrupan en proyectos con secciones (hasta tres
niveles) y se parten en subtareas sin límite. Dos demostraciones adentro,
sin encabezado propio para ninguna de las dos — el H2 de la sección ya las
presenta:

- **La galería de transformaciones** (`TransformationsSection`): seis
  oraciones reales, sacadas de `docs/parser-test-cases.md`, calculadas con
  el parser de verdad (`lib/landing/static-parses.ts`), cada una
  demostrando una capacidad distinta. Antes era su propia sección, al mismo
  nivel que "El problema" — se reubicó acá porque sus seis ejemplos son
  literalmente los atributos de una tarea (ver D-HERO en `design.md`).

  | Capacidad | Oración | Caso |
  | --- | --- | --- |
  | Fecha | `Cumpleaños de Ana 15 de marzo` | #12 |
  | Hora | `Reunión a las 3` | #25 |
  | Duración | `Correr 1h30m` | #28 |
  | Prioridad | `Llamar al contador p1` | #38 |
  | Etiqueta | `Comprar leche #compras` | #40 |
  | Repetición | `Gimnasio cada lunes, miércoles y viernes por 1h` | #57 |

- **El lenguaje de consulta**: tres ejemplos de filtro reales (sintaxis de
  `docs/product-spec.md` §7), cada uno con su significado en lenguaje
  natural al lado — mismo tratamiento visual que la galería de arriba.

  | Consulta | Qué devuelve |
  | --- | --- |
  | `priority:1,2 & due:next7days` | Prioridad urgente o alta, que vence esta semana |
  | `project:Trabajo & !label:espera` | Todo lo de Trabajo, menos lo que está en espera |
  | `due:overdue` | Todo lo atrasado |

El árbol de jerarquía de proyectos anidados que tenía esta sección antes se
borró: cualquier competidor lo tiene, no es un diferencial, y la estructura
ya se explica en prosa arriba. La leyenda de sintaxis de ocho filas (una
sección aparte, entre la demo y la galería) también se borró: decía "ocho
tipos de dato" cuando eran siete (fecha relativa y puntual comparten color),
y el color de cada tipo ya se explica solo interactuando con la demo.

### 4. Lo que querés sostener

Nueva. Un hábito no es una tarea que se repite: no vence, no se completa una
vez y desaparece. Se repite todos los días, cierta cantidad de veces por
semana, o en días puntuales, y Trazio lleva la cuenta de racha actual, mejor
racha y constancia del último mes. Sin lenguaje motivacional ni "no rompas
la racha" — se informa, no se arenga.

### 5. Lo que ya está agendado

Nueva, con **fondo oscuro fijo**: se ve oscura sea cual sea el tema del
sistema del visitante, porque es una decisión de contenido (mostrar cómo se
ve la app de verdad), no una preferencia de tema — ver D-DARK en
`design.md`. Los eventos de Google Calendar aparecen junto a las tareas y
los hábitos en la misma grilla de horas. Muestra un preview de calendario
con al menos tres bloques (tarea, hábito, evento), distinguibles por forma
igual que en la app real — ver "Sistema gráfico" más abajo para el detalle
técnico de por qué es un componente nuevo y no una reutilización del
calendario real.

### 6. El día que entra

Nueva. La resta entre lo pedido y las horas que quedan: si sobra tiempo se
ve, si no entra avisa sin números en rojo ni culpa, y "¿Qué hago ahora?"
propone una tarea que entra en el próximo hueco libre. Depende de una
función que se construyó en paralelo a este rediseño (`el-dia-que-entra`):
el texto es estático y puede mergearse a `main` sin que esa función esté en
producción, pero **el deploy a producción de la landing completa espera** a
que sí lo esté — ver D-GATE en `design.md`.

### 7. CTA (banda)

El mismo botón, sin titular propio, después de "El día que entra" — no
inmediatamente después del hero, donde repetía el mismo CTA a dos
centímetros de distancia. En este punto el visitante ya recorrió el
problema, las tres cosas que Trazio junta, y acaba de leer que además le
dice si el día entra: recién ahí se ofrece la cuenta, cerrando el arco del
titular. El CTA principal se repite en total en tres puntos del flujo de
scroll (hero, esta banda, cierre) más el CTA fijo de móvil, fuera del flujo
— ver "Un solo CTA principal" más abajo: sigue siendo un único CTA
distinto, no varios compitiendo.

### 8. Por qué es gratis

Nueva. Un motivo real, no una repetición de "gratis": sin anuncios, sin
venta de datos, la app completa desde hoy sin tarjeta. Ver "Precio" más
abajo para la restricción de qué puede y no puede decir sobre el futuro.

### 9. Preguntas directas

Estilo Basecamp, sin cambios de fondo desde la versión anterior: seis
preguntas, cada respuesta trazable a `docs/product-spec.md` §13 o
`docs/decisions.md` — no son concesiones de copy. Dos respuestas se
corrigieron en este rediseño porque habían quedado más restrictivas que el
producto real:

- ¿Funciona sin internet? — No.
- ¿Puedo compartir un proyecto con alguien? — No en el sentido de invitar a
  alguien a editar, pero sí con un enlace de lectura (D59).
- ¿Hay una app en Google Play o el App Store? — Todavía no. Se instala desde
  el navegador.
- ¿Puedo exportar mis tareas? — No como exportación con archivo, pero sí se
  puede copiar un proyecto entero como markdown al portapapeles (D60).
- ¿Trazio tiene versión en inglés? — No.
- ¿Cuánto cuesta usar Trazio? — Nada.

### 10. Cierre y pie

Sin cambios: repetición del CTA con el mismo texto del hero, titular corto,
nada más. Pie mínimo: logo, año, y links a términos y privacidad. Sin mapa
del sitio, sin redes sociales que todavía no existen.

---

## Precio

**Gratis, sin plan pago, en toda la fase 1 a 4.** No hay sección de precios en
la landing. Si algún día existe un plan pago, el lugar natural es **entre "Por
qué es gratis" (sección 8) y "Preguntas directas" (sección 9)** — no antes:
las secciones 1 a 7 son la demostración del producto, y el precio se presenta
después de haber mostrado todo, nunca antes (D-GRATIS en
`openspec/changes/landing-para-la-vida-entera/design.md`). En ese momento la
sección 8 se reemplaza por una sección de precios real (o conviven las dos, si
sigue habiendo un plan gratuito) — el resto del orden no cambia.

No poner "gratis durante el beta" ni nada que insinúe un cobro futuro sin
tenerlo definido: genera preguntas que no podés responder. La pregunta directa
"¿Cuánto cuesta usar Trazio?" en la sección 9 se contesta igual: "Nada. Es
gratis, sin tarjeta." — sin ninguna cláusula sobre el futuro.

---

## Sistema gráfico

Sin imágenes. Ni una sola captura de producto en toda la página — es una
dirección elegida, no una limitación: las capturas no son el recurso
principal de esta landing. Recursos, todos en CSS:

- **El resaltado de tokens es el sistema gráfico de la página.** Colores
  sobre texto: pesa cero, escala infinito, y es el producto en sí. Se usa en
  el hero y la galería de transformaciones — siempre el mismo color para el
  mismo tipo de dato (`docs/design-system.md` §2.1).
- **Malla de fondo del hero** (`landing-hero-mesh` en `app/globals.css`):
  radiales en el azul de marca, sin ninguna imagen de fondo.
- **El preview de calendario** (sección 5, `CalendarDayPreview`): un
  componente nuevo y autocontenido bajo `components/marketing/`, Server
  Component puro, con datos de ejemplo fijos
  (`lib/landing/calendar-preview-data.ts`) — deliberadamente **no** reutiliza
  `components/calendar/` (~30 archivos, todos `"use client"`, con
  `@dnd-kit`, `ResizeObserver` y `next-themes`), para no sumar ese bundle a
  una página pública. Los tres tipos de bloque (tarea, hábito, evento) se
  distinguen por forma, sin leyenda de texto — ver D-CAL en
  `openspec/changes/landing-para-la-vida-entera/design.md` para el detalle
  completo de la decisión.
- **La sección de fondo oscuro fijo** (sección 5, D-DARK): se ve oscura sea
  cual sea el tema del sistema del visitante, con colores arbitrarios
  tomados literalmente de la paleta `.dark` de `app/globals.css` en vez de
  las utilidades semánticas que sí cambian con el tema — el desacople de la
  clase `.dark` del `<html>` es intencional, no un olvido.
- **Animación al scroll con CSS puro**: la galería de transformaciones
  aparece con una animación ligada a `animation-timeline: view()`, envuelta
  en `@supports` (degrada sola en navegadores sin soporte) y en
  `@media (prefers-reduced-motion: no-preference)`. Cero JavaScript, cero
  librerías de animación.

La tarjeta de Open Graph (`app/(marketing)/opengraph-image.tsx`) se genera
con `ImageResponse` de Next.js a partir del logo (`public/logo.png`) y la
tipografía de marca — versionada en el repo, no una captura de pantalla.

---

## Requisitos técnicos

- **Server Components enteramente.** La única isla cliente es la demo del parser
  (`ParserDemo`, embebida directo en `HeroSection`).
- **`/` estática.** La galería de transformaciones no lee nada en tiempo de
  request: se calcula con `parse()` contra un instante de referencia fijo
  (`lib/landing/demo-context.ts`), en build time.
- **LCP por debajo de 2,5 segundos.** El elemento de LCP es texto (el hero),
  no una imagen.
- **Móvil primero.** Diseñar la versión de teléfono antes que la de
  escritorio. El CTA principal tiene que ser alcanzable con el pulgar y
  quedar visible al hacer scroll — además del CTA repetido en el flujo,
  `MobileStickyCta` es un CTA fijo (`position: fixed`, `sm:hidden`), visible
  únicamente en teléfono, implementado sin JavaScript.
- **Metadatos completos**: título, descripción, Open Graph con imagen generada,
  y `lang="es-AR"`.
- **Sin animaciones que compitan** con el CTA. Micro-transiciones al hacer scroll,
  nada más, y respetando `prefers-reduced-motion` en todo lo que se mueve.
- **Accesibilidad AA**: contraste, foco visible, navegación por teclado.

## Analítica

Registrar únicamente: visitas, clics en el CTA, interacciones con la demo del
parser, y registros completados. Con eso se calcula la conversión y se ve si la demo
tracciona. No instalar un stack de analítica pesado para cuatro métricas.

---

## Lo que esta landing no lleva

- Testimonios inventados o logos de empresas que no son clientes.
- Contadores de usuarios falsos.
- Chat de soporte.
- Popup de newsletter.
- Comparativas contra productos con nombre y apellido.
- Un segundo CTA distinto compitiendo con el principal (otro texto, otro destino
  — "ver demo", "hablar con ventas"). El CTA principal sí se repite, con el mismo
  texto y el mismo destino, en varios puntos del scroll: ver "Un solo CTA
  principal — pero puede repetirse" más arriba y "Estructura" para las
  ubicaciones actuales.
- Video.
