# editor-de-descripcion Specification

## Purpose
TBD - created by archiving change interfaz-propia. Update Purpose after archive.
## Requirements
### Requirement: Zona de edición delimitada visualmente

El editor de descripción SHALL mostrar su zona de edición con un límite visual
propio (borde, fondo o superficie diferenciada del resto del detalle de
tarea), de forma que se distinga sin ambigüedad dónde se escribe de dónde
termina el editor.

#### Scenario: La zona de edición se distingue del resto del detalle

- **WHEN** se abre el detalle de una tarea con el editor de descripción
  visible
- **THEN** la zona de edición tiene un límite visual propio que la distingue
  del resto del panel

### Requirement: Barra de herramientas completa

El editor de descripción SHALL ofrecer una barra de herramientas con: títulos
de varios niveles, negrita, cursiva, tachado, resaltado, código en línea,
listas con viñetas, listas numeradas, listas de tareas, y cita.

#### Scenario: Cada opción de la barra aplica su formato

- **WHEN** se selecciona texto en el editor y se usa cada opción de la barra
  de herramientas (título, negrita, cursiva, tachado, resaltado, código,
  lista con viñetas, lista numerada, lista de tareas, cita)
- **THEN** el formato correspondiente se aplica al texto seleccionado

### Requirement: Autodetección de sintaxis de markdown en la entrada

El editor SHALL reconocer sintaxis de markdown mientras se escribe y
convertirla en el formato correspondiente en el momento, tanto al empezar un
bloque como dentro de un párrafo ya empezado: por ejemplo, escribir `#`
seguido de un espacio al inicio de una línea SHALL producir un título, nunca
el carácter `#` literal, y escribir `**texto**` dentro de un párrafo ya
empezado SHALL producir negrita, sin dejar los asteriscos como texto
literal. La autodetección en línea SHALL cubrir negrita, cursiva, tachado,
código en línea y resaltado — la misma familia de formato que ya ofrece la
barra de herramientas. Esta autodetección SHALL ser exclusivamente de
entrada: el contenido SHALL seguir guardándose como el documento estructurado
de Tiptap que exige la capacidad `tareas`, nunca como texto plano con marcas
de markdown.

#### Scenario: Escribir `#` produce un título, no el carácter

- **WHEN** se escribe `# ` (numeral seguido de espacio) al inicio de una línea
  vacía del editor
- **THEN** la línea se convierte en un título
- **AND** el carácter `#` no queda como texto literal en el documento

#### Scenario: Escribir negrita, cursiva, tachado, código o resaltado dentro de un párrafo produce el formato

- **WHEN** se escribe `**texto**`, `*texto*`, `~~texto~~`, `` `texto` `` o
  `==texto==` dentro de un párrafo ya empezado
- **THEN** el texto queda en negrita, cursiva, tachado, código en línea o
  resaltado, según corresponda
- **AND** ninguna de las marcas de sintaxis (`**`, `*`, `~~`, el backtick o
  `==`) queda como texto literal en el documento

#### Scenario: Lo guardado sigue siendo el documento estructurado, no texto con marcas

- **WHEN** la autodetección de markdown convierte texto escrito en formato,
  sea al empezar un bloque (título, lista, cita) o dentro de un párrafo ya
  empezado (negrita, cursiva, tachado, código, resaltado)
- **THEN** el contenido se guarda en la columna `description` como documento
  jsonb de Tiptap
- **AND** ninguna marca de sintaxis markdown (como `#`, `**` o `-`) queda
  almacenada como parte del texto

### Requirement: Menú contextual propio, sin el del navegador

El editor SHALL reemplazar el menú contextual nativo del navegador por uno
propio, que ofrezca opciones de formato, opciones de párrafo, opciones de
insertar, y las opciones de portapapeles — incluyendo pegar sin formato.

#### Scenario: El clic derecho abre el menú propio

- **WHEN** se hace clic derecho dentro de la zona de edición
- **THEN** se abre el menú contextual propio del editor, no el menú nativo del
  navegador

#### Scenario: Pegar sin formato está disponible

- **WHEN** se usa la opción "pegar sin formato" del menú contextual con
  contenido con estilo en el portapapeles
- **THEN** el contenido se pega como texto plano, sin conservar el formato de
  origen

### Requirement: Insertar tabla, nota al pie, bloque de código, regla horizontal y destacado

El menú de insertar del editor SHALL ofrecer: tabla, nota al pie, bloque de
código, regla horizontal y destacado.

#### Scenario: Cada opción de insertar agrega su elemento

- **WHEN** se usa cada opción del menú de insertar (tabla, nota al pie, bloque
  de código, regla horizontal, destacado)
- **THEN** el elemento correspondiente se agrega al documento en la posición
  del cursor

### Requirement: Enlaces sin diálogo nativo del navegador

El editor SHALL permitir insertar y editar un enlace sin usar `window.prompt`
ni ningún otro diálogo nativo del navegador para pedir la URL. La entrada de
la URL SHALL resolverse con un componente propio del editor.

#### Scenario: Insertar un enlace no dispara un prompt nativo

- **WHEN** se usa la acción de insertar o editar un enlace en el editor
- **THEN** se abre un componente propio del editor para ingresar la URL
- **AND** en ningún momento se dispara `window.prompt` ni otro diálogo nativo
  del navegador

### Requirement: La fórmula matemática queda fuera de alcance

El editor NUNCA SHALL ofrecer renderizado ni edición de fórmulas matemáticas
en esta fase. La decisión **OQ1** de `design.md` la excluye de forma explícita
por el costo de la dependencia frente a un uso marginal en un gestor de tareas
personal; el resto de las capacidades del editor (títulos, negrita, cursiva,
tachado, resaltado, código, listas, citas, tablas y notas al pie) no dependen
de ella y sí entran.

#### Scenario: No hay ninguna opción de fórmula matemática

- **WHEN** se revisa la barra de herramientas, el menú de insertar y el menú
  contextual del editor
- **THEN** ninguno ofrece una opción para insertar o renderizar una fórmula
  matemática

### Requirement: El autoguardado no pisa lo que se está escribiendo

El autoguardado de la descripción SHALL nunca sobrescribir el contenido que
la persona usuaria está escribiendo en ese momento. Si llega una actualización
remota (por ejemplo, vía Realtime) mientras hay una edición en curso o
pendiente de guardar, esa actualización remota NUNCA SHALL reemplazar el
contenido local no guardado todavía.

#### Scenario: Una actualización remota no pisa una edición en curso

- **WHEN** se está escribiendo en el editor de descripción y llega una
  actualización remota de esa misma tarea antes de que el autoguardado local
  haya terminado de persistir
- **THEN** el texto que se está escribiendo permanece en el editor, sin ser
  reemplazado por la actualización remota

#### Scenario: El autoguardado persiste sin perder cambios recientes

- **WHEN** se edita la descripción y se sigue escribiendo mientras el
  autoguardado envía una versión anterior al servidor
- **THEN** la versión final persistida corresponde al último contenido
  escrito, no a una versión intermedia que descarte las últimas pulsaciones

