# indicadores-de-atajo Specification

## Purpose
TBD - created by archiving change interfaz-descubrible. Update Purpose after archive.
## Requirements
### Requirement: Dónde se muestran los indicadores de atajo

El panel lateral, los menús contextuales, y cualquier botón que tenga un atajo de teclado asociado SHALL mostrar el indicador de ese atajo junto al control correspondiente.

#### Scenario: El panel lateral muestra el indicador de sus accesos

- **WHEN** el usuario ve un acceso del panel lateral que tiene un atajo de
  teclado asociado
- **THEN** ese acceso muestra el indicador de ese atajo

#### Scenario: Un menú contextual muestra el indicador de sus acciones

- **WHEN** el usuario abre un menú contextual con acciones que tienen un
  atajo de teclado asociado
- **THEN** cada una de esas acciones muestra el indicador de su atajo

#### Scenario: Un botón con atajo muestra su indicador

- **WHEN** un botón de la interfaz tiene un atajo de teclado asociado
- **THEN** ese botón muestra el indicador de ese atajo

### Requirement: Un acorde se dibuja como dos teclas separadas

Un indicador que representa un acorde SHALL dibujarse como dos teclas separadas visualmente, una por cada pulsación, en vez de como una única cadena de texto.

#### Scenario: G seguido de H se muestra como dos teclas

- **WHEN** el usuario ve el indicador del atajo de navegación a Hoy, que es
  el acorde `G` seguido de `H`
- **THEN** el indicador muestra dos teclas separadas, `G` y `H`
- **AND** el indicador no muestra una única cadena de texto `"G H"`

### Requirement: Los indicadores no se muestran en ancho de teléfono

Los indicadores de atajo MUST NOT mostrarse por debajo del punto de corte de teléfono que define el sistema de diseño, donde no hay teclado físico que use el atajo, aunque el atajo siga registrado y disponible si se conecta un teclado.

#### Scenario: En ancho de teléfono no aparece ningún indicador

- **WHEN** el ancho de la pantalla está por debajo del punto de corte de
  teléfono
- **THEN** ningún indicador de atajo se muestra, ni en el panel lateral, ni
  en los menús contextuales, ni en ningún botón

#### Scenario: El atajo sigue funcionando aunque el indicador no se vea

- **WHEN** el ancho de la pantalla está por debajo del punto de corte de
  teléfono y hay un teclado físico conectado
- **THEN** el atajo se dispara igual, aunque su indicador no se muestre

### Requirement: Un indicador nunca anuncia un atajo que no funciona

Un indicador de atajo SHALL alimentarse de la misma definición que registra ese atajo en `lib/shortcuts/`, de forma que la tecla o el acorde que muestra sea siempre el que efectivamente dispara la acción. Donde leer esa definición no sea posible, el indicador SHALL mostrar una cadena literal acompañada de un test que verifique que esa cadena coincide con el binding real; un indicador MUST NOT mostrarse a partir de una cadena literal que no tenga ese test.

#### Scenario: El indicador cambia solo si cambia el binding real

- **WHEN** el binding registrado para un atajo cambia de tecla
- **THEN** el indicador de ese atajo muestra la tecla nueva sin necesitar
  ningún cambio manual en el componente que lo dibuja

#### Scenario: Una cadena literal sin test que la respalde no es válida

- **WHEN** un indicador no puede leer la definición del atajo desde
  `lib/shortcuts/` y se escribe como cadena literal
- **THEN** existe un test que verifica que esa cadena coincide con el
  binding real registrado
- **AND** si el binding cambia sin actualizar la cadena, ese test falla

