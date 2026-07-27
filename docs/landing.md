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
- **Un solo CTA principal.** Las páginas con un CTA convierten alrededor de 13,5%
  frente a 10,5% de las que tienen cinco o más. Las opciones secundarias aparecen
  más abajo, cuando el visitante ya tiene contexto.
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

> Nota interna: el segundo diferencial recién existe en la fase 3-4. En la landing
> de la fase 1, comunicarlo como lo que viene, no como lo que hay. No prometer lo
> que la app todavía no hace.

---

## Estructura

Una sola página, con estas secciones en este orden. El parser es el
esqueleto: aparece congelado en la sección 1, interactivo en la 2, explicado
en la 3 y demostrado seis veces en la 4, antes de hablar de cualquier otra
cosa.

### 1. Hero

Sin captura de producto. Tres elementos:

- **Titular** — el resultado, no la funcionalidad: *"Tu día entero, en una
  sola pantalla."* En la escala tipográfica exclusiva de la landing
  (`text-landing-hero`, `docs/design-system.md` §4.1): 44px a 76px según el
  viewport, relación de 2,75× a 4,75× contra el cuerpo — antes topaba a 40px
  y 2,5×.
- **Subtítulo** — una línea de soporte: *"Escribí lo que tenés que hacer
  como se lo dirías a alguien. Trazio entiende la fecha, la hora y la
  prioridad solo."*
- **El campo del parser, congelado** — el elemento visual principal,
  reemplaza a la captura de pantalla. Es texto renderizado en el servidor
  (`HeroParserPreview`, sin JavaScript): la oración de ejemplo con sus
  tokens ya resaltados por tipo y los chips del resultado debajo, más un
  cursor decorativo que parpadea con CSS (`.landing-caret`, apagado con
  `prefers-reduced-motion`). Consecuencia técnica buscada: el LCP es texto,
  no una imagen — se sacaron los 79 KB de captura que cargaban arriba del
  pliegue en la versión anterior.

**CTA principal** — "Crear mi cuenta gratis", un solo botón, con *"Gratis.
Sin tarjeta."* debajo.

Sin menú de navegación con links que se lleven al visitante afuera. Como mucho, el
logo a la izquierda y un "Iniciar sesión" discreto a la derecha.

### 2. La demo

El mismo campo del hero, ahora interactivo: al hidratar, `ParserDemo` toma
el control con el mismo marcado visual (mismos colores de token, mismos
chips). Es la **única isla cliente de toda la página** — su estado inicial
ya viene parseado (el primer ejemplo, calculado en el primer render), así
que se entiende incluso antes de que el JavaScript termine de cargar.

Cuatro ejemplos tocables, el primero compartido con el hero:

- `Reunión con Ana el próximo martes a las 3pm por 45min p2 #trabajo @Trabajo`
- `Llamar al contador mañana a las 10`
- `Pagar el alquiler cada mes p1`
- `Gimnasio cada lunes, miércoles y viernes por 1h`

### 3. Lo que entiende

Leyenda de sintaxis, puro CSS, cero imágenes: ocho filas (fecha relativa,
fecha puntual, hora, duración, repetición, prioridad de p1 a p4, etiqueta con
`#`, proyecto con `@`), cada una con un ejemplo real de
`docs/parser-test-cases.md` y el mismo color de token que ya vio resaltado en
el hero y la demo. El color identifica la categoría en toda la página, no la
fila — fecha relativa y fecha puntual comparten color porque comparten tipo
de token.

### 4. Galería de transformaciones

Reemplaza a la grilla de seis funcionalidades de la versión anterior. Seis
oraciones reales — sacadas de `docs/parser-test-cases.md`, casos que el
parser efectivamente pasa, calculadas con el parser de verdad
(`lib/landing/static-parses.ts`) y no inventadas a mano — cada una
demostrando una capacidad distinta: fecha, hora, duración, prioridad,
etiqueta, repetición. Estática, renderizada en el servidor.

| Capacidad | Oración | Caso |
| --- | --- | --- |
| Fecha | `Cumpleaños de Ana 15 de marzo` | #12 |
| Hora | `Reunión a las 3` | #25 |
| Duración | `Correr 1h30m` | #28 |
| Prioridad | `Llamar al contador p1` | #38 |
| Etiqueta | `Comprar leche #compras` | #40 |
| Repetición | `Gimnasio cada lunes, miércoles y viernes por 1h` | #57 |

### 5. Y después de escribirla

Todo lo que no es el parser, en una sola narrativa y no en grilla: la tarea
cae en la Bandeja, aparece en Hoy, vive en un proyecto con secciones, se
parte en subtareas, y está igual en la compu y en el teléfono. Un solo
recorte de interfaz (`sync.webp`, ya recortado a los datos, no una pantalla
completa) ilustra el último punto — el más difícil de creer sin verlo.

### 6. Preguntas directas

Nueva en este rediseño, estilo Basecamp: la landing anterior no abordaba las
limitaciones del producto en ningún lado. Alguien evaluando una app sin
usuarios va a querer preguntar igual, así que se contesta de frente. Cada
respuesta sale de `docs/product-spec.md` §13 o `docs/decisions.md` — no son
concesiones de copy, son restricciones reales:

- ¿Funciona sin internet? — No.
- ¿Puedo compartir un proyecto con alguien? — No, Trazio es personal.
- ¿Hay una app en Google Play o el App Store? — Todavía no. Se instala desde
  el navegador.
- ¿Puedo exportar mis tareas? — No, en ninguna versión.
- ¿Trazio tiene versión en inglés? — No.
- ¿Cuánto cuesta usar Trazio? — Nada.

### 7. Hoja de ruta

Sección honesta y breve: hábitos con rachas, filtros guardados, recordatorios,
Google Calendar y atajos de teclado. Presentado como hoja de ruta, no como si ya
existiera.

Esto genera confianza en vez de romperla, y le da al visitante una razón para
volver.

### 8. Cierre y pie

Repetición del CTA con el mismo texto del hero, titular corto, nada más.
Pie mínimo: logo, año, y links a términos y privacidad. Sin mapa del sitio,
sin redes sociales que todavía no existen.

---

## Precio

**Gratis, sin plan pago, en toda la fase 1.** No hay sección de precios en la
landing. Cuando exista un modelo, se agrega entre la galería de
transformaciones y el cierre.

No poner "gratis durante el beta" ni nada que insinúe un cobro futuro sin tenerlo
definido: genera preguntas que no podés responder. La pregunta directa "¿Cuánto
cuesta usar Trazio?" en la sección 6 se contesta igual: "Nada. Es gratis, sin
tarjeta." — sin ninguna cláusula sobre el futuro.

---

## Sistema gráfico

Sin imágenes generadas. Tres recursos, los tres en CSS:

- **El resaltado de tokens es el sistema gráfico de la página.** Colores
  sobre texto: pesa cero, escala infinito, y es el producto en sí. Se usa en
  el hero, la demo, la leyenda y la galería — siempre el mismo color para el
  mismo tipo de dato (`docs/design-system.md` §2.1).
- **Malla de fondo del hero** (`landing-hero-mesh` en `app/globals.css`):
  radiales en el azul de marca, sin ninguna imagen de fondo.
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
  (`ParserDemo`, hidratada desde `ParserDemoSection`).
- **`/` estática.** Ni el hero ni la galería leen nada en tiempo de request:
  se calculan con `parse()` contra un instante de referencia fijo
  (`lib/landing/demo-context.ts`), en build time.
- **LCP por debajo de 2,5 segundos.** El elemento de LCP es texto (el hero),
  no una imagen.
- **Móvil primero.** Diseñar la versión de teléfono antes que la de escritorio.
  El CTA tiene que ser alcanzable con el pulgar y quedar visible al hacer scroll.
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
- Más de un CTA principal.
- Video.
