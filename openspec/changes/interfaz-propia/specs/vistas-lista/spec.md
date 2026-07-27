## MODIFIED Requirements

### Requirement: Navegación de escritorio en fase 1

El panel lateral de escritorio SHALL ser colapsable a una versión angosta de
solo íconos mediante un control de colapsar distinguible del resto de los
accesos, y SHALL mostrar, de arriba a abajo: nombre y correo de la cuenta; el
botón de agregar tarea; los accesos principales Bandeja de entrada, Hoy con
su contador y Completado; la lista de favoritos; el árbol de proyectos con la
cantidad de tareas por proyecto y ramas colapsables; y al pie, un menú de
cuenta que agrupa cambiar tema, Configuración y cerrar sesión, en vez de
mostrarlos sueltos. Los accesos a Próximos, Hábitos, Etiquetas y Filtros no
existen en fase 1.

#### Scenario: Contenido del panel lateral colapsable

- **WHEN** el usuario ve el panel lateral en escritorio
- **THEN** el panel muestra, de arriba a abajo, nombre y correo de la cuenta,
  el botón de agregar tarea, los accesos principales Bandeja de entrada, Hoy
  con su contador y Completado, la lista de favoritos, el árbol de proyectos
  con cantidad de tareas por proyecto y ramas colapsables, y al pie un menú
  de cuenta que agrupa cambiar tema, Configuración y cerrar sesión
- **AND** el usuario puede colapsar el panel a una versión angosta de solo
  íconos usando un control de colapsar distinguible del resto de los accesos

#### Scenario: El botón de agregar tarea abre el componente de alta

- **WHEN** el usuario hace clic en el botón de agregar tarea del panel
  lateral
- **THEN** se abre el componente de alta de tareas

#### Scenario: Las opciones de cuenta están agrupadas en un menú, no sueltas en el pie

- **WHEN** el usuario abre el menú de cuenta del pie del panel lateral
- **THEN** el menú muestra juntas las opciones de cambiar tema, Configuración
  y cerrar sesión
- **AND** ninguna de esas tres opciones aparece suelta fuera del menú

#### Scenario: Accesos que no existen en fase 1

- **WHEN** el usuario ve el panel lateral en escritorio
- **THEN** el panel no muestra ningún acceso a Próximos, Hábitos, Etiquetas
  ni Filtros

## ADDED Requirements

### Requirement: Ancho de contenido adaptativo en las vistas de lista

El ancho de la columna de contenido de las vistas de lista SHALL crecer junto
con el ancho de la ventana hasta un tope máximo, en vez de detenerse en un
ancho fijo angosto, y la metadata de una tarea SHALL acompañar al título en
vez de fijarse al borde derecho del contenedor. El valor concreto del tope y
el comportamiento intermedio los define la skill de diseño `ui-ux-pro-max`;
este requisito fija el comportamiento, no un número.

#### Scenario: El contenido usa más ancho en una pantalla amplia

- **WHEN** la ventana tiene un ancho de escritorio amplio
- **THEN** el ancho de la columna de contenido de la vista SHALL ser mayor
  que en una pantalla angosta, hasta el tope máximo definido por el sistema
  de diseño
- **AND** el ancho SHALL NOT quedar detenido en el valor fijo angosto
  anterior

#### Scenario: La metadata acompaña al título en vez de pegarse al borde

- **WHEN** se muestra el título de una tarea junto a su metadata (fecha,
  prioridad, etc.) en una pantalla ancha
- **THEN** la metadata SHALL mostrarse a una distancia acotada del título
- **AND** NUNCA SHALL mostrarse pegada al borde derecho del contenedor con un
  espacio vacío grande entre el título y la metadata
