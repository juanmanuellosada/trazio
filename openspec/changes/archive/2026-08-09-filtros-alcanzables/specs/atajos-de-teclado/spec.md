## ADDED Requirements

### Requirement: El acorde G llega también a Filtros

El acorde `G` SHALL ofrecer un destino para la pantalla de Filtros, con una tecla que no colisione con las que ya usa (`I` Bandeja, `H` Hoy, `P` Próximos, `E` Etiquetas, `C` Completado, `A` Hábitos).

La tecla elegida SHALL verificarse contra los atajos existentes, NUNCA suponerse libre.

#### Scenario: El acorde G abre Filtros

- **WHEN** se presiona `G` seguido de la tecla asignada a Filtros
- **THEN** SHALL abrirse la pantalla de filtros

#### Scenario: La tecla nueva no pisa un destino existente

- **WHEN** se revisan los destinos del acorde `G`
- **THEN** cada tecla SHALL llevar a una sola pantalla
