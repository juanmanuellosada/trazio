## MODIFIED Requirements

### Requirement: Crear y editar un proyecto

Toda cuenta SHALL poder crear un proyecto con nombre, y SHALL poder editar en
cualquier momento su nombre, color, ícono y descripción. El color SHALL
elegirse de una lista desplegable con el nombre y la muestra de cada color de
la paleta fija de proyecto —la misma paleta de diez colores, validada con un
check constraint en base de datos y con el mismo esquema de Zod compartido
desde `lib/validation/`—, que SHALL seguir siendo el camino principal y la
primera opción ofrecida. Al final de esa lista SHALL ofrecerse una opción de
color personalizado, como salida y no como reemplazo de la paleta: un color
personalizado SHALL validarse por contraste contra el fondo de superficie del
tema claro y contra el del tema oscuro antes de guardarse, y MUST NOT
aceptarse ningún color personalizado cuyo contraste no alcance el mínimo de
accesibilidad en cualquiera de los dos temas. El ícono SHALL elegirse con un
selector de emojis que ofrece todos los emojis, categorizados y buscables, en
vez de un campo donde se escribe el emoji. Al crear un proyecto, SHALL poder
elegirse también su proyecto padre —"sin padre" como valor por defecto,
respetando el máximo de tres niveles que ya impone la base de datos— y SHALL
poder marcarse como favorito desde la misma alta.

#### Scenario: Crear un proyecto con los campos básicos

- **WHEN** una persona crea un proyecto nuevo indicando nombre, color de la
  paleta y un emoji como ícono, sin elegir proyecto padre ni marcarlo como
  favorito
- **THEN** el proyecto se guarda con esos valores, sin proyecto padre (nivel
  superior), sin marcar como favorito, y con una descripción vacía por defecto

#### Scenario: Elegir un color de la paleta desde la lista desplegable

- **WHEN** se abre el selector de color al crear o editar un proyecto
- **THEN** se muestra una lista desplegable con el nombre y la muestra de cada
  uno de los diez colores de la paleta, y al final una opción de color
  personalizado

#### Scenario: Un color personalizado que no da contraste se rechaza

- **WHEN** se elige la opción de color personalizado y se indica un color cuyo
  contraste contra el fondo de superficie del tema claro o del tema oscuro no
  alcanza el mínimo de accesibilidad
- **THEN** ese color se rechaza
- **AND** el proyecto no se guarda con ese color

#### Scenario: Elegir el ícono con el selector de emojis

- **WHEN** se abre el selector de ícono al crear o editar un proyecto
- **THEN** se ofrecen todos los emojis, organizados por categoría y con una
  búsqueda para encontrarlos por nombre

#### Scenario: Elegir proyecto padre al crear, con "sin padre" por defecto

- **WHEN** se crea un proyecto sin elegir explícitamente ningún proyecto padre
- **THEN** el proyecto se crea sin padre, como proyecto de primer nivel
- **WHEN** se elige un proyecto existente como padre durante la creación
- **THEN** el proyecto se crea anidado bajo ese padre, respetando el máximo de
  tres niveles de la capacidad `proyectos-secciones`

#### Scenario: Marcar favorito desde el alta

- **WHEN** se marca la opción de favorito al crear un proyecto
- **THEN** el proyecto queda creado y marcado como favorito desde el momento de
  su creación

#### Scenario: Editar nombre, color, ícono y descripción

- **WHEN** se edita un proyecto existente cambiando su nombre, su color, su
  ícono o su descripción
- **THEN** el proyecto queda actualizado con los nuevos valores
- **AND** el resto de sus campos no cambia

#### Scenario: Un identificador de color inválido se rechaza

- **WHEN** se intenta crear o editar un proyecto con un valor de color que no
  es ninguno de los diez identificadores de la paleta ni un color
  personalizado con formato válido
- **THEN** la operación se rechaza tanto en la validación de Zod como en el
  check constraint de la base de datos
