# menus-del-parser Specification

## Purpose
TBD - created by archiving change interfaz-refinada. Update Purpose after archive.
## Requirements
### Requirement: Escribir `#` o `@` abre un menú de selección

Al escribir `#` en el campo de alta rápida, la interfaz SHALL abrir un menú
con los proyectos del usuario y sus secciones anidadas. Al escribir `@`, la
interfaz SHALL abrir un menú con las etiquetas existentes del usuario. Esto
es funcionalidad nueva, distinta del reconocimiento de texto que el parser ya
hace: elegir de una lista, no reconocer lo tecleado.

#### Scenario: `#` abre el menú de proyectos y secciones

- **WHEN** el usuario escribe `#` en el campo de alta rápida
- **THEN** SHALL abrirse un menú con los proyectos del usuario
- **AND** cada proyecto SHALL mostrar sus secciones anidadas debajo

#### Scenario: `@` abre el menú de etiquetas

- **WHEN** el usuario escribe `@` en el campo de alta rápida
- **THEN** SHALL abrirse un menú con las etiquetas existentes del usuario

### Requirement: El menú y la escritura de corrido conviven y producen el mismo resultado

Escribir un token de corrido, sin abrir ni interactuar con el menú, SHALL
producir exactamente el mismo resultado —el mismo atributo, con el mismo
valor— que elegir la opción equivalente desde el menú. El menú NO SHALL
reemplazar el reconocimiento de texto que el parser ya hace (E7): ambos
caminos, tipear y elegir, SHALL coexistir siempre y ninguno SHALL
deshabilitar al otro. El menú NUNCA SHALL robar el foco del campo de texto ni
interceptar las teclas de escritura normal, porque si lo hace, escribir de
corrido se vuelve imposible y se pierde el diferencial declarado del
producto.

#### Scenario: Escribir `#Trabajo ` de corrido da el mismo resultado que elegirlo del menú

- **WHEN** el usuario escribe `#Trabajo ` completo, sin mirar ni tocar el
  menú que se abrió
- **THEN** el proyecto reconocido SHALL ser `Trabajo`
- **AND** el resultado SHALL ser idéntico al que se obtiene abriendo el menú
  con `#` y eligiendo `Trabajo` de la lista

#### Scenario: El foco permanece en el campo de texto mientras el menú está abierto

- **WHEN** el menú está abierto porque el usuario escribió `#` o `@`
- **THEN** el foco de teclado SHALL seguir en el campo de alta rápida
- **AND** el usuario SHALL poder seguir tecleando el resto del título sin que
  el menú lo interrumpa

### Requirement: El menú se puede ignorar y cerrar sin elegir

El usuario SHALL poder cerrar el menú sin seleccionar ninguna opción — con
Escape, escribiendo fuera del rango del token, o haciendo clic afuera — y el
texto ya escrito SHALL permanecer intacto.

#### Scenario: Escape cierra el menú sin alterar el texto

- **WHEN** el menú está abierto y el usuario presiona Escape
- **THEN** el menú SHALL cerrarse
- **AND** el texto escrito hasta ese momento SHALL permanecer sin cambios
- **AND** el reconocimiento del token SHALL seguir funcionando igual que si
  el menú nunca se hubiera abierto

#### Scenario: Seguir escribiendo fuera del token cierra el menú

- **WHEN** el menú está abierto y el usuario escribe un espacio u otro
  símbolo que termina el token
- **THEN** el menú SHALL cerrarse
- **AND** el token SHALL resolverse por el reconocimiento normal del parser

### Requirement: El menú es navegable con teclado

Con el menú abierto, las flechas arriba y abajo SHALL mover la selección
entre las opciones listadas, y Enter o Tab SHALL confirmar la opción
resaltada e insertarla en el token.

#### Scenario: Navegar con flechas y confirmar con Enter

- **WHEN** el menú está abierto y el usuario mueve la selección con las
  flechas arriba/abajo y presiona Enter
- **THEN** la opción resaltada en ese momento SHALL insertarse en el token
- **AND** el menú SHALL cerrarse

### Requirement: El menú filtra a medida que se sigue escribiendo

El menú SHALL filtrar sus opciones a medida que el usuario escribe caracteres
después de `#` o `@`, quedándose solo con las que coincidan con lo tecleado
hasta ese momento, comparando sin distinguir mayúsculas ni acentos (mismo
criterio que E7). El menú SHALL actualizar la lista en cada tecla.

#### Scenario: Escribir después de `@` filtra la lista de etiquetas

- **WHEN** el menú de etiquetas está abierto y el usuario sigue escribiendo
  `trab` después del `@`
- **THEN** la lista SHALL mostrar únicamente las etiquetas cuyo nombre
  coincide con `trab`, sin distinguir mayúsculas ni acentos

#### Scenario: Escribir después de `#` filtra proyectos y secciones

- **WHEN** el menú de proyectos está abierto y el usuario sigue escribiendo
  texto después del `#`
- **THEN** la lista SHALL mostrar únicamente los proyectos y secciones cuyo
  nombre coincide con ese texto, sin distinguir mayúsculas ni acentos

### Requirement: El menú de etiquetas ofrece crear una que no existe

El menú de etiquetas SHALL ofrecer una opción para crear una etiqueta nueva
cuando lo escrito después de `@` no coincide con ninguna etiqueta existente
del usuario. Elegir esa opción SHALL crear la etiqueta y asignarla a la
tarea, con el mismo comportamiento de persistencia que ya define el parser
para `@` (OQ1).

#### Scenario: `@` sin coincidencias ofrece crear la etiqueta

- **WHEN** el menú de etiquetas está abierto, el usuario escribió un nombre
  después de `@`, y ninguna etiqueta existente coincide
- **THEN** el menú SHALL mostrar una opción para crear una etiqueta nueva con
  ese nombre

#### Scenario: Elegir "crear etiqueta" la crea y la asigna

- **WHEN** el usuario elige la opción de crear una etiqueta nueva desde el
  menú
- **THEN** la etiqueta SHALL crearse para el usuario
- **AND** SHALL asignarse a la tarea que se está creando
- **AND** su chip SHALL mostrarse igual que si se hubiera creado escribiendo
  el token de corrido

### Requirement: El doble clic para desactivar un reconocimiento sigue funcionando igual

El doble clic sobre un token reconocido SHALL seguir desactivándolo (R7 del
parser), sin importar si ese token se completó escribiendo de corrido o
eligiendo una opción del menú.

#### Scenario: Doble clic desactiva un token elegido desde el menú

- **WHEN** un token se completó eligiendo una opción del menú de `#` o `@`
- **AND** el usuario hace doble clic sobre ese resaltado
- **THEN** el resaltado SHALL desaparecer
- **AND** el atributo asociado SHALL descartarse
- **AND** el texto del token SHALL permanecer en el título como texto común

