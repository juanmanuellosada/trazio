## ADDED Requirements

### Requirement: Hero sin distracciones

El hero SHALL mostrar un titular orientado al resultado, un subtítulo de una
línea, un único botón de CTA con el texto "Crear mi cuenta gratis", y una
captura real de la vista Hoy (no una ilustración genérica ni un mockup de
laptop). Debajo del botón SHALL aparecer la línea "Gratis. Sin tarjeta." La
cabecera NO SHALL tener menú de navegación con links que saquen al visitante
de la landing; como mucho, el logo a la izquierda y un "Iniciar sesión"
discreto a la derecha.

#### Scenario: Elementos del hero

- **WHEN** se carga la landing
- **THEN** el hero SHALL mostrar título, subtítulo, un único botón de CTA con
  el texto "Crear mi cuenta gratis", y la captura real de la vista Hoy
- **AND** debajo del botón SHALL aparecer la línea "Gratis. Sin tarjeta."

#### Scenario: Sin navegación que saque al visitante

- **WHEN** se revisa la cabecera del hero
- **THEN** NO SHALL existir un menú de navegación con links que lleven fuera
  de la landing
- **AND** como mucho SHALL mostrarse el logo y un "Iniciar sesión" discreto

### Requirement: Demo del parser en vivo

La landing SHALL incluir una sección con un campo de texto real donde el
visitante escribe y ve el parseo en vivo: las palabras reconocidas se
resaltan y aparece la tarjeta de tarea resultante con fecha, hora, prioridad
y etiqueta ya cargadas, sin necesidad de registrarse.

#### Scenario: Parseo en vivo sin registrarse

- **WHEN** el visitante escribe texto en el campo de la demo
- **THEN** las palabras reconocidas SHALL resaltarse en vivo
- **AND** SHALL aparecer la tarjeta de tarea resultante con los atributos
  reconocidos
- **AND** ninguna de estas interacciones SHALL requerir que el visitante se
  registre o inicie sesión

### Requirement: El problema, sin dramatizar

La sección "El problema" SHALL tener entre tres y cuatro líneas, centradas en
el costo de no tener un sistema (cosas que se olvidan, la cabeza ocupada
recordando). NO SHALL dramatizar ni tratar "productividad" como valor moral.

#### Scenario: Extensión y tono acotados

- **WHEN** se revisa la sección "El problema"
- **THEN** SHALL tener entre 3 y 4 líneas
- **AND** NO SHALL usar un tono dramático ni presentar la productividad como
  un valor moral

### Requirement: Grilla de funcionalidades con seis bloques

La grilla de Funcionalidades SHALL mostrar como máximo seis bloques, cada uno
con ícono, título de tres palabras, línea de descripción y una captura chica
y real de esa parte de la interfaz. Para la fase 1, los seis bloques SHALL
ser exactamente: Bandeja de entrada, Hoy, Proyectos y secciones, Prioridades y
fechas, Subtareas, y Sincronización al instante ("abrís en la compu y en el
teléfono, siempre igual"). El bloque "Atajos de teclado" NO SHALL aparecer en
esta grilla, porque los atajos son de fase 2.

#### Scenario: Los seis bloques de fase 1, sin atajos de teclado

- **WHEN** se revisa la grilla de Funcionalidades
- **THEN** SHALL mostrar exactamente estos seis bloques: Bandeja de entrada,
  Hoy, Proyectos y secciones, Prioridades y fechas, Subtareas, y
  Sincronización al instante
- **AND** "Atajos de teclado" NO SHALL aparecer entre ellos

### Requirement: "Lo que viene" como hoja de ruta, no como funcionalidad existente

La sección "Lo que viene" SHALL presentar, como hoja de ruta y no como algo
que ya existe: hábitos con rachas, filtros guardados, recordatorios, Google
Calendar, y atajos de teclado.

#### Scenario: Roadmap explícito, no funcionalidad presente

- **WHEN** se revisa la sección "Lo que viene"
- **THEN** SHALL mencionar hábitos con rachas, filtros guardados,
  recordatorios, Google Calendar y atajos de teclado
- **AND** SHALL presentarlos como hoja de ruta futura, sin dar a entender que
  ya están disponibles

### Requirement: Cierre con el mismo CTA del hero

La sección de cierre SHALL repetir el CTA con el mismo texto usado en el
hero, junto con un titular corto, sin agregar elementos adicionales.

#### Scenario: Repetición fiel del CTA

- **WHEN** se revisa la sección de cierre
- **THEN** SHALL mostrar el mismo texto de CTA que el hero
- **AND** SHALL limitarse a un titular corto y el botón, sin otros elementos

### Requirement: Pie mínimo

El pie SHALL mostrar únicamente logo, año, y links a las páginas de términos
y privacidad. NO SHALL incluir mapa del sitio ni links a redes sociales.

#### Scenario: Contenido mínimo del pie

- **WHEN** se revisa el pie de la landing
- **THEN** SHALL mostrar logo, año y links a términos y privacidad
- **AND** NO SHALL incluir mapa del sitio ni links a redes sociales

### Requirement: Server Components enteros salvo la demo (G1)

La landing SHALL renderizarse enteramente con Server Components. La única
excepción SHALL ser el campo de la demo del parser, que es la única isla
cliente de toda la página.

#### Scenario: Una sola isla cliente

- **WHEN** se audita el árbol de componentes de la landing
- **THEN** todo componente SHALL ser Server Component
- **AND** el único Client Component SHALL ser el de la demo del parser

### Requirement: La demo del parser no llama a un backend (G2)

La demo SHALL importar la función pura del parser directamente, sin pasar por
una API. SHALL pasarle listas de proyectos y etiquetas vacías, de modo que
tokens como `@Proyectos` y `#trabajo` se muestren indicando que se crearían.
El ejemplo principal precargado SHALL ser el caso 53 del contrato (`Reunión
con Ana el próximo martes a las 3pm por 45min p2 #trabajo @Proyectos`), y
SHALL incluir además los tres ejemplos precargados de `docs/landing.md`:
`Llamar al contador mañana a las 10`, `Pagar el alquiler cada mes p1`, y
`Gimnasio cada lunes, miércoles y viernes por 1h`.

#### Scenario: Importación directa y listas vacías

- **WHEN** se carga el componente de la demo
- **THEN** SHALL importar la función `parse` directamente, sin ninguna
  llamada de red
- **AND** SHALL invocarla con `proyectos` y `etiquetas` vacíos
- **AND** los tokens `@` y `#` reconocidos SHALL mostrarse indicando que se
  crearían

#### Scenario: Ejemplos precargados de la demo

- **WHEN** se revisan los ejemplos precargados de la demo
- **THEN** el ejemplo principal SHALL ser el caso 53 del contrato
- **AND** SHALL estar precargados también los tres ejemplos de
  `docs/landing.md`

### Requirement: LCP por debajo de 2,5 segundos

La landing SHALL lograr un LCP menor a 2,5 segundos. Las imágenes SHALL usar
formato moderno, SHALL declarar sus dimensiones, y la imagen del hero SHALL
tener prioridad de carga.

#### Scenario: Presupuesto de LCP e imágenes optimizadas

- **WHEN** se mide el rendimiento de carga de la landing
- **THEN** el LCP SHALL ser menor a 2,5 segundos
- **AND** las imágenes SHALL estar en formato moderno con dimensiones
  declaradas
- **AND** la imagen del hero SHALL cargarse con prioridad

### Requirement: Diseño móvil primero

La landing SHALL diseñarse priorizando el teléfono. El botón de CTA SHALL ser
alcanzable con el pulgar sin necesidad de estirar la mano.

#### Scenario: CTA alcanzable con el pulgar en móvil

- **WHEN** se abre la landing en un viewport de teléfono
- **THEN** el botón de CTA principal SHALL estar dentro del alcance cómodo
  del pulgar

### Requirement: Metadatos completos

La landing SHALL declarar título, descripción, Open Graph con imagen, y
`lang="es-AR"`.

#### Scenario: Metadatos presentes en el HTML

- **WHEN** se inspeccionan los metadatos de la página
- **THEN** SHALL existir título, descripción y Open Graph con imagen
- **AND** el atributo `lang` del documento SHALL ser `es-AR`

### Requirement: Accesibilidad AA

La landing SHALL cumplir el nivel AA: contraste suficiente, foco visible en
todos los elementos interactivos, y navegación completa por teclado.

#### Scenario: Contraste, foco y navegación por teclado

- **WHEN** se audita la accesibilidad de la landing
- **THEN** el contraste de texto SHALL cumplir AA
- **AND** todo elemento interactivo SHALL mostrar foco visible
- **AND** la página SHALL navegarse por completo con el teclado

### Requirement: Lighthouse por encima de 90, verificado en CI (G5)

CI SHALL verificar, sobre el deploy de preview y no a ojo, el criterio de
aceptación del roadmap: Lighthouse por encima de 90 en rendimiento y
accesibilidad.

#### Scenario: Chequeo automatizado sobre el deploy de preview

- **WHEN** se genera un deploy de preview en un pull request
- **THEN** CI SHALL correr un chequeo de Lighthouse contra ese preview
- **AND** SHALL fallar si el puntaje de rendimiento o de accesibilidad no
  supera 90

### Requirement: Analítica acotada a cuatro métricas (G3)

La landing SHALL usar Vercel Analytics y SHALL registrar únicamente cuatro
métricas: visitas, clics en el CTA, interacciones con la demo del parser, y
registros completados.

#### Scenario: Solo cuatro métricas registradas

- **WHEN** se audita qué eventos registra la analítica
- **THEN** SHALL registrarse únicamente visitas, clics en el CTA,
  interacciones con la demo y registros completados
- **AND** ninguna otra métrica o evento SHALL agregarse

### Requirement: Términos y privacidad existen en fase 1 (G4)

Las páginas de términos y de privacidad SHALL maquetarse en fase 1, con sus
metadatos correspondientes, como páginas estáticas dentro de
`app/(marketing)/`, dado que el pie las linkea y no pueden ser links rotos. El
contenido legal de ambas páginas SHALL ser provisto por el dueño del
proyecto: la implementación NUNCA SHALL redactar un texto legal genérico ni
publicar un texto de relleno en su lugar. La landing NUNCA SHALL publicarse en
producción con estas páginas vacías o con texto de relleno: contar con el
texto definitivo del dueño del proyecto es un bloqueo para el deploy de
producción.

#### Scenario: Los links del pie no rompen

- **WHEN** se hace clic en los links de términos o de privacidad del pie
- **THEN** SHALL llevar a una página estática existente en
  `app/(marketing)/`, nunca a un enlace roto

#### Scenario: El texto legal lo aporta el dueño del proyecto

- **WHEN** se maquetan las páginas de términos y privacidad en fase 1
- **THEN** la implementación deja lista la estructura y los metadatos de
  ambas páginas
- **AND** NO SHALL redactar contenido legal propio ni un texto de relleno

#### Scenario: Sin texto definitivo, no hay deploy a producción

- **WHEN** llega el momento de desplegar a producción y el dueño del proyecto
  todavía no entregó el texto definitivo de términos o de privacidad
- **THEN** la landing NO SHALL publicarse a producción con esas páginas
  vacías o con texto de relleno
- **AND** el deploy a producción queda bloqueado hasta contar con el texto
  definitivo

### Requirement: Gratis, sin plan pago ni insinuación de cobro futuro

En fase 1 la app SHALL comunicarse como gratis, sin plan pago. La landing NO
SHALL tener sección de precios. NO SHALL usarse ninguna frase que insinúe un
cobro futuro, como "gratis durante el beta".

#### Scenario: Sin sección de precios ni insinuación de cobro

- **WHEN** se revisa la landing completa
- **THEN** NO SHALL existir una sección de precios
- **AND** NO SHALL aparecer ninguna frase que insinúe un cobro futuro

### Requirement: Lo que la landing no lleva

La landing NUNCA SHALL incluir: testimonios inventados, logos de empresas que
no son clientes, contadores de usuarios falsos, chat de soporte, popup de
newsletter, comparativas contra productos con nombre y apellido, ni más de un
botón de CTA principal.

#### Scenario: Ausencia de elementos prohibidos

- **WHEN** se audita la landing completa
- **THEN** NO SHALL encontrarse testimonios inventados, logos de empresas que
  no son clientes, contadores de usuarios falsos, chat de soporte, popup de
  newsletter, ni comparativas contra productos con nombre y apellido
- **AND** SHALL existir un único botón de CTA principal en toda la página
