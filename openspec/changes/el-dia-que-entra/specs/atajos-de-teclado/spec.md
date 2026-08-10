## ADDED Requirements

### Requirement: Atajo para "¿Qué hago ahora?"

Con el foco fuera de un campo de texto, la aplicación SHALL registrar un
atajo de tecla suelta para disparar "¿Qué hago ahora?" (capacidad
`que-hago-ahora`) desde la pantalla Hoy.

La tecla elegida SHALL verificarse contra los atajos existentes en el
momento de implementar, NUNCA SHALL suponerse libre — mismo procedimiento
que ya usó el acorde `G` al sumar el destino de Filtros.

#### Scenario: El atajo dispara la acción en Hoy

- **WHEN** estando en la pantalla Hoy, sin foco en un campo de texto, se
  presiona la tecla asignada
- **THEN** se dispara "¿Qué hago ahora?"

#### Scenario: La tecla nueva no pisa un atajo existente

- **WHEN** se revisan los atajos de tecla suelta ya registrados antes de
  asignar la tecla de "¿Qué hago ahora?"
- **THEN** la tecla elegida SHALL ser una que ningún otro atajo de tecla
  suelta ya use
