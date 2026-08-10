## REMOVED Requirements

### Requirement: Hero sin distracciones

**Reason**: Describía una captura real de la vista Hoy que ya no existe en
el código: el rediseño "El editor" (implementado sin pasar por OpenSpec, ver
`proposal.md`) reemplazó esa captura por el campo del parser congelado, y
este mismo change funde ese campo con la demo interactiva. Queda
reemplazado por el requirement nuevo "Hero con demo del parser interactiva
desde arriba", que cubre el hero completo.

**Migration**: Ninguna — el requirement nuevo cubre todo lo que cubría este,
más la demo.

### Requirement: Demo del parser en vivo

**Reason**: La demo deja de ser una sección aparte de la landing y pasa a
vivir dentro del hero, visible desde el primer scroll en vez de una sección
más abajo. Su comportamiento (parseo en vivo, resaltado por tipo de token,
tarjeta de resultado, sin necesidad de registrarse) se conserva íntegro,
ahora dentro del requirement "Hero con demo del parser interactiva desde
arriba".

**Migration**: Ninguna funcional — solo cambia dónde vive el requirement.

### Requirement: Grilla de funcionalidades con seis bloques

**Reason**: Esta grilla (seis bloques con ícono, captura chica y
descripción) no existe en el código desde antes de este change: quedó
reemplazada, sin que el spec se actualizara, por la galería de
transformaciones del parser. Es parte del desfasaje entre este spec y el
código real, documentado en `proposal.md`.

**Migration**: Ninguna — no hay nada que migrar porque el código ya no tenía
esta grilla. Su reemplazo real (la galería de transformaciones) queda
cubierto por el requirement nuevo "Lo que tenés que hacer: estructura y
lenguaje de consulta".

## MODIFIED Requirements

### Requirement: El problema, sin dramatizar

La landing SHALL incluir, como tercera sección, un bloque "El problema" que
describe con precisión el costo de no tener un sistema único —tareas,
hábitos y calendario en lugares separados que no se comunican entre sí—,
sin nombrar todavía la solución: la solución la muestran las tres secciones
siguientes ("Lo que tenés que hacer", "Lo que querés sostener", "Lo que ya
está agendado"). El bloque SHALL tener entre tres y cinco oraciones. NO
SHALL usar signos de exclamación, lenguaje dramático, ni tratar la
productividad como un valor moral.

#### Scenario: Extensión y tono acotados

- **WHEN** se revisa la sección "El problema"
- **THEN** SHALL tener entre tres y cinco oraciones
- **AND** NO SHALL usar exclamaciones ni presentar la productividad como un
  valor moral

#### Scenario: No nombra la solución todavía

- **WHEN** se lee el cuerpo de la sección "El problema"
- **THEN** NO SHALL mencionar una función de Trazio como solución dentro de
  la misma sección
- **AND** SHALL limitarse a describir el estado sin sistema único

### Requirement: Diseño móvil primero

La landing SHALL diseñarse priorizando el teléfono. El botón de CTA
principal SHALL ser alcanzable con el pulgar sin necesidad de estirar la
mano. Además del CTA repetido en el flujo de la página, SHALL existir un CTA
fijo (`position: fixed`), visible únicamente en viewports de teléfono, que
permanece alcanzable con el pulgar mientras se hace scroll por cualquier
punto de la página, implementado sin JavaScript.

#### Scenario: CTA alcanzable con el pulgar en móvil

- **WHEN** se abre la landing en un viewport de teléfono
- **THEN** el botón de CTA principal SHALL estar dentro del alcance cómodo
  del pulgar

#### Scenario: CTA fijo visible al scrollear en móvil

- **WHEN** se abre la landing en un viewport de teléfono y se hace scroll a
  cualquier punto de la página
- **THEN** SHALL permanecer visible un botón de CTA fijo en la parte
  inferior de la pantalla
- **AND** NO SHALL requerir JavaScript para mostrarse ni para permanecer
  visible

#### Scenario: El CTA fijo no aparece en escritorio

- **WHEN** se abre la landing en un viewport de escritorio
- **THEN** el CTA fijo de móvil NO SHALL mostrarse

### Requirement: Accesibilidad AA

La landing SHALL cumplir el nivel AA: contraste suficiente, foco visible en
todos los elementos interactivos, y navegación completa por teclado.

#### Scenario: Contraste, foco y navegación por teclado

- **WHEN** se audita la accesibilidad de la landing
- **THEN** el contraste de texto SHALL cumplir AA
- **AND** todo elemento interactivo SHALL mostrar foco visible
- **AND** la página SHALL navegarse por completo con el teclado

#### Scenario: La sección de fondo oscuro fijo mantiene contraste en los dos temas

- **WHEN** el visitante tiene el tema claro del sistema activo, o el tema
  oscuro
- **THEN** la sección "Lo que ya está agendado" SHALL mostrarse con el mismo
  fondo oscuro fijo en los dos casos
- **AND** SHALL cumplir el contraste AA de todos modos

### Requirement: Gratis, sin plan pago ni insinuación de cobro futuro

En toda la fase 1 a 4 la app SHALL comunicarse como gratis, sin plan pago.
La landing NO SHALL tener sección de precios. NO SHALL usarse, en ningún
texto de la landing —incluida la sección "Por qué es gratis"—, ninguna
frase que insinúe un cobro futuro, como "gratis durante el beta" o "gratis
por ahora". La sección "Por qué es gratis" SHALL explicar el motivo real de
que la app sea gratis (por ejemplo: sin publicidad, sin venta de datos, sin
versión recortada), sin hacer ninguna promesa sobre el futuro en ningún
sentido — ni que seguirá siendo gratis para siempre, ni que va a dejar de
serlo.

#### Scenario: Sin sección de precios ni insinuación de cobro

- **WHEN** se revisa la landing completa
- **THEN** NO SHALL existir una sección de precios
- **AND** NO SHALL aparecer ninguna frase que insinúe un cobro futuro

#### Scenario: La explicación no promete gratuidad eterna ni insinúa una suba inminente

- **WHEN** se revisa el texto de la sección "Por qué es gratis"
- **THEN** SHALL explicar un motivo real y verificable de por qué la app es
  gratis hoy
- **AND** NO SHALL prometer ni asegurar que la app seguirá siendo gratis para
  siempre
- **AND** NO SHALL insinuar que un cobro está por llegar o es inminente

### Requirement: Lo que esta landing no lleva

La landing NUNCA SHALL incluir: testimonios inventados, logos de empresas
que no son clientes, contadores de usuarios falsos, chat de soporte, popup
de newsletter, comparativas contra productos con nombre y apellido, ni más
de un botón de CTA principal distinto (otro texto, otro destino — el mismo
CTA sí puede repetirse en varios puntos del scroll). NUNCA SHALL incluir
capturas de pantalla ni video del producto: todo elemento visual que
muestre la interfaz —incluido el preview de calendario de "Lo que ya está
agendado"— SHALL construirse con componentes reales renderizados en el
servidor, nunca con archivos de imagen.

#### Scenario: Ausencia de elementos prohibidos

- **WHEN** se audita la landing completa
- **THEN** NO SHALL encontrarse testimonios inventados, logos de empresas
  que no son clientes, contadores de usuarios falsos, chat de soporte,
  popup de newsletter, ni comparativas contra productos con nombre y
  apellido
- **AND** SHALL existir un único botón de CTA principal distinto en toda la
  página

#### Scenario: Ninguna sección usa una captura de pantalla del producto

- **WHEN** se audita cada sección de la landing, incluida "Lo que ya está
  agendado"
- **THEN** NO SHALL encontrarse ningún archivo de imagen que muestre la
  interfaz del producto
- **AND** todo elemento visual que represente la interfaz SHALL ser
  HTML/CSS renderizado en el servidor

## ADDED Requirements

### Requirement: Hero con demo del parser interactiva desde arriba

El hero SHALL mostrar, en este orden: un titular orientado al resultado
("Tu día no entra en una lista."), un subtítulo de una a dos líneas que
nombra las tres cosas que junta Trazio ("Trazio junta lo que tenés que
hacer, lo que querés sostener y lo que ya está agendado. Y te dice si entra
en las horas que te quedan."), la demo interactiva del parser —interactiva
desde el primer render, sin una versión congelada previa en una sección
separada— y un único botón de CTA con el texto "Crear mi cuenta gratis",
con la línea "Gratis. Sin tarjeta." debajo. NO SHALL mostrar ninguna
captura de pantalla del producto: el elemento visual principal es la demo
del parser. La cabecera NO SHALL tener menú de navegación con links que
saquen al visitante de la landing; como mucho, el logo a la izquierda y un
"Iniciar sesión" discreto a la derecha.

La demo dentro del hero SHALL comportarse igual que cualquier demo en vivo
del parser: el visitante escribe texto y ve el parseo en vivo, con las
palabras reconocidas resaltadas y la tarjeta de tarea resultante (fecha,
hora, prioridad, etiqueta), sin necesidad de registrarse. SHALL importar la
función `parse` directamente, sin pasar por una API, con `proyectos` y
`etiquetas` de ejemplo — tokens como `@Proyecto` y `#etiqueta` SHALL
mostrarse indicando que se crearían.

#### Scenario: Elementos del hero, en orden

- **WHEN** se carga la landing
- **THEN** el hero SHALL mostrar, en orden, titular, subtítulo, la demo
  interactiva del parser y el botón de CTA con "Gratis. Sin tarjeta."
  debajo
- **AND** NO SHALL mostrarse ninguna captura de pantalla del producto

#### Scenario: La demo es interactiva desde el primer render

- **WHEN** se carga la landing, incluso antes de que el JavaScript termine
  de hidratar
- **THEN** el campo de la demo SHALL mostrar un ejemplo ya parseado (texto
  resaltado y tarjeta de resultado)
- **AND** al hidratar, escribir en el campo SHALL actualizar el resaltado y
  la tarjeta en vivo

#### Scenario: Sin navegación que saque al visitante

- **WHEN** se revisa la cabecera del hero
- **THEN** NO SHALL existir un menú de navegación con links que lleven
  fuera de la landing
- **AND** como mucho SHALL mostrarse el logo y un "Iniciar sesión" discreto

#### Scenario: Parseo en vivo sin registrarse

- **WHEN** el visitante escribe texto en el campo de la demo del hero
- **THEN** las palabras reconocidas SHALL resaltarse en vivo
- **AND** SHALL aparecer la tarjeta de tarea resultante con los atributos
  reconocidos
- **AND** ninguna de estas interacciones SHALL requerir que el visitante se
  registre o inicie sesión

### Requirement: Lo que tenés que hacer: estructura y lenguaje de consulta

La landing SHALL incluir una sección "Lo que tenés que hacer" que
comunique, sin un árbol de jerarquía dibujado en HTML: que fecha, hora,
duración, prioridad y etiqueta salen del texto escrito, reforzado con una
galería de al menos cuatro ejemplos reales calculados con el parser de
verdad, cada uno demostrando una capacidad distinta; y que las tareas se
agrupan en proyectos con secciones, anidadas hasta tres niveles, y se
parten en subtareas sin límite. La misma sección SHALL incluir una
demostración del lenguaje de consulta (filtros): al menos tres ejemplos de
consulta real, con la sintaxis de `docs/product-spec.md` §7 (campo:valor
combinado con `&`, `|` o `!`), cada uno junto con una descripción en
lenguaje natural de qué tareas devuelve.

#### Scenario: Atributos del parser demostrados, no descritos

- **WHEN** se revisa la sección "Lo que tenés que hacer"
- **THEN** SHALL mostrar al menos cuatro ejemplos reales de oraciones
  parseadas, cada uno demostrando una capacidad distinta del parser
- **AND** NO SHALL depender de un árbol de jerarquía dibujado en HTML

#### Scenario: Estructura de proyectos explicada en prosa

- **WHEN** se lee el cuerpo de la sección
- **THEN** SHALL comunicar que las tareas se agrupan en proyectos con
  secciones, anidadas hasta tres niveles, y se parten en subtareas sin
  límite

#### Scenario: Lenguaje de consulta demostrado con ejemplos reales

- **WHEN** se revisa la sección "Lo que tenés que hacer"
- **THEN** SHALL mostrar al menos tres ejemplos de consulta con sintaxis
  real del lenguaje de filtros
- **AND** cada ejemplo SHALL mostrar, en lenguaje natural, qué tareas
  devuelve

### Requirement: Lo que querés sostener: hábitos con racha y constancia

La landing SHALL incluir una sección "Lo que querés sostener" que comunique
que un hábito es distinto de una tarea (no vence, no se completa una vez y
desaparece), sus tres formas de repetirse (todos los días, cierta cantidad
de veces por semana, días específicos), y que Trazio calcula racha actual,
mejor racha y constancia. NO SHALL usar lenguaje motivacional ni tratar
romper una racha como un fracaso — se informa, no se arenga.

#### Scenario: Contenido mínimo de la sección

- **WHEN** se revisa la sección "Lo que querés sostener"
- **THEN** SHALL mencionar que un hábito no vence y no desaparece al
  completarse una vez
- **AND** SHALL mencionar racha, mejor racha y constancia
- **AND** NO SHALL usar lenguaje motivacional ni de urgencia sobre no
  perder la racha

### Requirement: Lo que ya está agendado: calendario real en fondo oscuro

La landing SHALL incluir una sección "Lo que ya está agendado" con fondo
oscuro fijo, independiente del tema del sistema del visitante (el fondo
oscuro SHALL verse igual si el visitante tiene el tema claro o el oscuro
activo), que comunique que los eventos de Google Calendar aparecen junto a
las tareas y los hábitos en la misma grilla de horas. La sección SHALL
mostrar un preview de calendario con componentes reales renderizados en el
servidor —estático, sin datos en vivo, sin arrastre ni redimensionado—, con
al menos tres bloques (una tarea, un hábito y un evento) distinguibles por
forma, igual que en la vista de calendario real de la app. El preview NO
SHALL reutilizar componentes de `components/calendar/` ni sumar
dependencias cliente (`@dnd-kit`, `next-themes`, tooltips) al bundle
público de la landing.

#### Scenario: Fondo oscuro fijo en los dos temas del sistema

- **WHEN** el visitante tiene el tema claro del sistema activo
- **THEN** la sección SHALL mostrarse con fondo oscuro de todos modos
- **AND** lo mismo SHALL ocurrir con el tema oscuro del sistema activo

#### Scenario: Preview estático con tres tipos de bloque

- **WHEN** se revisa el preview de calendario de esta sección
- **THEN** SHALL mostrar al menos una tarea, un hábito y un evento,
  distinguibles por forma
- **AND** NO SHALL responder a arrastre, redimensionado ni ningún gesto
  interactivo

#### Scenario: Sin dependencias cliente nuevas en el bundle público

- **WHEN** se audita el árbol de importaciones del preview de calendario
- **THEN** NO SHALL importar ningún módulo de `components/calendar/`
- **AND** NO SHALL agregar una isla cliente nueva a la landing — la demo
  del parser sigue siendo la única excepción al requirement "Server
  Components enteros salvo la demo (G1)"

### Requirement: El día que entra: sección condicionada a su propia función

La landing SHALL incluir una sección "El día que entra" que comunique que
Trazio resta lo pedido contra las horas libres del día y avisa —sin
tratamiento visual de alarma ni comparación punitiva— cuando lo pedido no
entra, y que mencione la acción "¿Qué hago ahora?". El código de esta
sección SHALL poder implementarse y mergearse independientemente de que la
funcionalidad que describe exista en producción, porque su contenido es
estático. Sin embargo, la landing completa NUNCA SHALL desplegarse a
producción mientras la funcionalidad que describe esta sección no esté
también en producción: publicar antes prometería una función inexistente.

#### Scenario: Contenido sin tratamiento punitivo

- **WHEN** se revisa el texto de la sección "El día que entra"
- **THEN** SHALL comunicar la resta entre lo pedido y el tiempo libre del
  día
- **AND** NO SHALL usar color de alerta, puntaje, ni lenguaje de culpa

#### Scenario: El deploy a producción espera a la función real

- **WHEN** se evalúa si desplegar la landing a producción
- **AND** la funcionalidad que describe "El día que entra" todavía no está
  en producción
- **THEN** el deploy a producción de la landing NO SHALL realizarse
- **AND** el código de la sección SHALL poder existir mergeado en la rama
  principal de todos modos

### Requirement: Por qué es gratis

La landing SHALL incluir una sección "Por qué es gratis" que dé un motivo
real y verificable de por qué la app no cobra (por ejemplo: sin publicidad,
sin venta de datos, sin versión recortada esperando un pago), sin hacer
ninguna promesa sobre el futuro del precio, ni a favor ni en contra. Ver
también el requirement "Gratis, sin plan pago ni insinuación de cobro
futuro" para la restricción compartida.

#### Scenario: Motivo real, no una repetición de "gratis"

- **WHEN** se revisa el texto de la sección "Por qué es gratis"
- **THEN** SHALL explicar un motivo concreto, no solo repetir que la app es
  gratis
- **AND** ese motivo SHALL ser verificable contra la política de privacidad
  o el comportamiento real de la app

### Requirement: Preguntas directas

La landing SHALL incluir una sección "Preguntas directas" con al menos seis
preguntas frecuentes, cada una con una respuesta que sale de
`docs/product-spec.md` §13 o de `docs/decisions.md` — nunca una concesión de
copy. La respuesta a "¿Puedo compartir un proyecto con alguien?" SHALL
mencionar que Trazio es personal (sin equipos ni edición ajena) y que un
proyecto puede generar un enlace de lectura de solo lectura (D59). La
respuesta a "¿Puedo exportar mis tareas?" SHALL aclarar que no existe
exportación con archivo ni importador, y que un proyecto se puede copiar
como markdown al portapapeles (D60).

#### Scenario: Las respuestas reflejan las excepciones D59 y D60

- **WHEN** se revisan las respuestas a "¿Puedo compartir un proyecto con
  alguien?" y "¿Puedo exportar mis tareas?"
- **THEN** cada una SHALL mencionar la restricción real (sin equipos; sin
  archivo exportable)
- **AND** cada una SHALL mencionar también la excepción vigente (enlace de
  lectura; copiar como markdown)

#### Scenario: Ninguna respuesta es una concesión de copy

- **WHEN** se audita cualquier respuesta de "Preguntas directas"
- **THEN** SHALL poder rastrearse a una restricción o excepción documentada
  en `docs/product-spec.md` §13 o `docs/decisions.md`

### Requirement: Metadata y tarjeta de compartir con el diferencial, no la categoría

La landing SHALL exponer, en su metadata (`<title>`, `description` y sus
equivalentes de `openGraph`), el diferencial de Trazio —tareas, hábitos y
calendario juntos— en vez de describir solo la categoría ("gestor de
tareas"). El `<title>` SHALL conservar el término de categoría como anzuelo
de búsqueda, pero SHALL sumarle las tres cosas que junta Trazio. La imagen
de compartir (`opengraph-image.tsx`) SHALL usar la misma promesa en su
bajada y en su texto alternativo, y SHALL verificarse generada (no solo
leída en el código) para confirmar que el texto entra en el lienzo de
1200×630 sin desbordarse ni cortarse.

#### Scenario: El título nombra las tres cosas, no solo la categoría

- **WHEN** se revisa el `<title>` de la landing
- **THEN** SHALL incluir el término "gestor de tareas" o equivalente de
  categoría
- **AND** SHALL incluir también las tres cosas que junta Trazio (tareas,
  hábitos, calendario) o una síntesis equivalente

#### Scenario: La tarjeta de compartir entra sin desbordarse

- **WHEN** se genera `/opengraph-image` y se inspecciona el PNG resultante
  de 1200×630
- **THEN** el texto de la bajada SHALL verse completo, sin cortarse ni
  desbordar el lienzo
