## ADDED Requirements

### Requirement: Selector de proyecto en el detalle de una tarea

El detalle de una tarea SHALL ofrecer un selector de proyecto, precargado
con el proyecto donde se creó la tarea (o vacío si es de la Bandeja de
entrada) y editable en cualquier momento. Al abrirse, SHALL desplegar todos
los proyectos de la persona usuaria con sus secciones anidadas, para poder
mover la tarea directamente a una sección desde cualquier punto de la app.
Elegir un destino desde este selector SHALL mover la tarea a ese proyecto o
sección, sujeto al mismo trigger de base de datos que ya valida que el
proyecto y la sección destino pertenezcan a la misma persona usuaria que la
tarea. Cuando la cantidad de proyectos y secciones sea grande, el selector
SHALL ofrecer búsqueda para encontrar el destino sin recorrer la lista
completa.

#### Scenario: El selector precarga el proyecto de origen

- **WHEN** se abre el detalle de una tarea que pertenece a un proyecto
- **THEN** el selector de proyecto del detalle muestra precargado ese
  proyecto

#### Scenario: El selector despliega todos los proyectos con sus secciones anidadas

- **WHEN** se abre el selector de proyecto desde el detalle de una tarea
- **THEN** se muestran todos los proyectos de la persona usuaria, cada uno
  con sus secciones anidadas debajo

#### Scenario: Elegir un destino mueve la tarea

- **WHEN** se elige un proyecto o una sección distinta desde el selector de
  proyecto del detalle
- **THEN** la tarea queda movida a ese proyecto o sección

#### Scenario: El trigger de base de datos sigue validando la pertenencia

- **WHEN** se intenta mover, desde este selector, una tarea a un proyecto o
  una sección que no pertenece a la misma persona usuaria que la tarea
- **THEN** el trigger de base de datos que ya valida esa pertenencia rechaza
  la operación

#### Scenario: Con muchos proyectos y secciones, el selector ofrece búsqueda

- **WHEN** la persona usuaria tiene una cantidad grande de proyectos y
  secciones
- **THEN** el selector de proyecto del detalle ofrece un campo de búsqueda
  para encontrar el destino sin recorrer la lista completa
