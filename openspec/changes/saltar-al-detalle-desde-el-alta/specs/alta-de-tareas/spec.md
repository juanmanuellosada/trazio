## ADDED Requirements

### Requirement: El alta ofrece continuar en el detalle de la tarea

El componente de alta SHALL ofrecer, en sus dos superficies, una acción que **cree la tarea y
abra su detalle**, además de confirmar y cancelar.

Esa acción SHALL conservar todo lo cargado en el alta: el título con lo que el lenguaje
natural haya interpretado, la descripción, la fecha, la fecha límite, la prioridad, las
etiquetas, los recordatorios y el destino.

SHALL estar visible **sin desplegar los campos**, incluso en el modal que abre plegado: el
usuario se da cuenta de que la tarea necesita más justo cuando el alta le queda corta, que es
antes de desplegar nada.

SHALL ser una acción **secundaria**: la principal del alta sigue siendo agregar la tarea, y la
nueva NUNCA SHALL competir visualmente con ella.

Su nombre SHALL dejar claro que **crea** la tarea, para que nadie la pulse creyendo que solo
muestra más campos.

#### Scenario: Continuar en el detalle crea la tarea y la abre

- **WHEN** el usuario escribe una tarea en el alta y elige continuar en el detalle
- **THEN** la tarea SHALL quedar creada
- **AND** SHALL abrirse su detalle

#### Scenario: No se pierde nada de lo cargado

- **WHEN** el usuario carga título, descripción, fecha, prioridad, etiquetas y destino en el
  alta y elige continuar en el detalle
- **THEN** el detalle SHALL mostrar todos esos valores

#### Scenario: La acción se ve sin desplegar

- **WHEN** el usuario abre el alta desde el panel lateral o desde su atajo, que abre plegada
- **THEN** la acción de continuar en el detalle SHALL estar visible
- **AND** NUNCA SHALL requerir desplegar los campos para encontrarla

#### Scenario: También está en el alta embebida

- **WHEN** el usuario abre el alta dentro de una lista o de una sección
- **THEN** SHALL ofrecerse la misma acción

#### Scenario: Cerrar el detalle no deshace la creación

- **WHEN** el usuario continúa en el detalle y después lo cierra sin editar nada
- **THEN** la tarea SHALL seguir existiendo, con lo que tenía al crearse
