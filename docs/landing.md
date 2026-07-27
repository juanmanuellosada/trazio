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

- **Titular** — el resultado, no la funcionalidad, y lo primero que hay que
  entender: qué es Trazio antes que qué tiene de distinto. *"Tu gestor de
  tareas personal, para el día entero."* En la escala tipográfica exclusiva
  de la landing (`text-landing-hero`, `docs/design-system.md` §4.1): 44px a
  76px según el viewport, relación de 2,75× a 4,75× contra el cuerpo — antes
  topaba a 40px y 2,5×.
- **Subtítulo** — recién acá entra el diferencial: *"Escribí lo que tenés
  que hacer como se lo dirías a alguien. Trazio entiende la fecha, la hora y
  la prioridad solo, y todo queda junto en una sola pantalla."*
- **El campo del parser, congelado, sin resultado** — el elemento visual
  principal, reemplaza a la captura de pantalla. Es texto renderizado en el
  servidor (`HeroParserPreview`, sin JavaScript): una sola oración de
  ejemplo con sus tokens ya resaltados por tipo, más un cursor decorativo
  que parpadea con CSS (`.landing-caret`, apagado con
  `prefers-reduced-motion`). A propósito **no** muestra los chips del
  resultado — eso es lo que diferencia al hero de la demo (sección 2): acá
  es la invitación (el campo con la frase), ahí es donde se despliega el
  resultado completo y se puede escribir. Mostrar las dos cosas en el hero
  haría que el visitante viera el mismo bloque resuelto dos veces seguidas
  al bajar. La frase del hero (caso #27, `Llamar mañana a las 10`) es
  además **distinta** de la que arranca la demo (caso #53): ningún ejemplo
  se repite entre secciones. Consecuencia técnica buscada: el LCP es texto,
  no una imagen — se sacaron los 79 KB de captura que cargaban arriba del
  pliegue en la versión anterior.

**CTA principal** — "Crear mi cuenta gratis", un solo botón, con *"Gratis.
Sin tarjeta."* debajo. Este es el primero de cinco puntos donde aparece el
mismo botón, con el mismo texto y el mismo destino (`/registro`): hero,
después de la demo (sección 2), después de la galería de transformaciones
(sección 4), después de las preguntas directas (sección 6), y en el cierre
(sección 8). Las tres repeticiones intermedias no llevan titular propio —
solo el botón, para no competir con la sección que las rodea. Ver "Un solo
CTA principal — pero puede repetirse" más arriba para la justificación.

Sin menú de navegación con links que se lleven al visitante afuera. Como mucho, el
logo a la izquierda y un "Iniciar sesión" discreto a la derecha.

### 2. La demo

Un campo interactivo con el mismo marcado visual que el hero (mismos
colores de token), pero acá sí con el resultado completo: al hidratar,
`ParserDemo` toma el control y despliega los chips (`ParseResultChips`)
debajo. Es la **única isla cliente de toda la página** — su estado inicial
ya viene parseado (el primer ejemplo, calculado en el primer render), así
que se entiende incluso antes de que el JavaScript termine de cargar.

Cuatro ejemplos tocables, ninguno igual al del hero:

- `Reunión con Ana el próximo martes a las 3pm por 45min p2 #trabajo @Trabajo`
  (caso #53, el ejemplo inicial — el más completo de los cuatro)
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

Todo lo que no es el parser, en dos recursos de texto y CSS y no en grilla
ni en captura de pantalla — el dueño del producto la sacó explícitamente de
esta sección porque un recorte de pantalla completa no se lee metido en
medio de una narrativa, sobre todo en el teléfono:

- **El recorrido**, condición → destino: si no le pusiste nada más cae en
  la Bandeja de entrada, si tiene fecha aparece en Hoy, si tiene proyecto
  vive ahí, si es grande se parte en subtareas, y es igual en la compu y en
  el teléfono. Cada destino es un chip (mismo lenguaje visual que
  `ParseResultChips`), no una frase corrida.
- **El árbol de la jerarquía** — la mitad del producto que la landing no
  explicaba: las tareas se agrupan en proyectos, los proyectos tienen
  secciones, los proyectos se anidan hasta tres niveles, y una tarea se
  parte en subtareas sin límite. Una jerarquía es un árbol, y un árbol se
  dibuja con HTML anidado (`<ul>`/`<li>`) e indentación — cero imágenes,
  cero peso, coherente con que el resaltado de tokens ya es el sistema
  gráfico de la página. El nodo de proyecto reutiliza el mismo color que
  `@Proyecto` en el parser: es el mismo concepto en los dos lados.

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

Sin imágenes. Ni una sola captura de producto en toda la página — es una
dirección elegida, no una limitación: las capturas no son el recurso
principal de esta landing. Cuatro recursos, los cuatro en CSS:

- **El resaltado de tokens es el sistema gráfico de la página.** Colores
  sobre texto: pesa cero, escala infinito, y es el producto en sí. Se usa en
  el hero, la demo, la leyenda y la galería — siempre el mismo color para el
  mismo tipo de dato (`docs/design-system.md` §2.1).
- **Malla de fondo del hero** (`landing-hero-mesh` en `app/globals.css`):
  radiales en el azul de marca, sin ninguna imagen de fondo.
- **El árbol de la jerarquía** (sección 5): HTML anidado con indentación y
  líneas de `border-l`, sin una sola imagen — ver sección 5 para el detalle.
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
- Un segundo CTA distinto compitiendo con el principal (otro texto, otro destino
  — "ver demo", "hablar con ventas"). El CTA principal sí se repite, con el mismo
  texto y el mismo destino, en varios puntos del scroll: ver "Un solo CTA
  principal — pero puede repetirse" más arriba y la sección 1 (Hero) para las
  ubicaciones actuales.
- Video.
