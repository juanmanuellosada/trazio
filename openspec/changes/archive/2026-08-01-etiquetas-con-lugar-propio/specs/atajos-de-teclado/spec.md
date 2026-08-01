## MODIFIED Requirements

### Requirement: Atajos generales de navegación y acceso rápido

La aplicación SHALL registrar, disponibles desde cualquier pantalla, el acorde `G` seguido de `I` (Bandeja de entrada), `H` (Hoy), `P` (Próximos), `E` (Etiquetas), `C` (Completado) o `A` (Hábitos); `S` para abrir el buscador; `Q` para abrir el alta rápida de tarea; `E` para abrir el alta de un nuevo evento de calendario; y `Ctrl/Cmd+Z` para deshacer. `G A` SHALL navegar a la pantalla de Hábitos (`/habitos`). `G E` SHALL navegar a la pantalla de administración de etiquetas (`/etiquetas`). `E` SHALL abrir el formulario de alta de un evento de calendario nuevo.

#### Scenario: El acorde G navega según la segunda tecla

- **WHEN** se presiona `G` y, dentro de la ventana del acorde, se presiona `I`
- **THEN** la aplicación navega a la Bandeja de entrada
- **WHEN** se presiona `G` y luego `H`
- **THEN** la aplicación navega a Hoy
- **WHEN** se presiona `G` y luego `P`
- **THEN** la aplicación navega a Próximos
- **WHEN** se presiona `G` y luego `E`
- **THEN** la aplicación navega a Etiquetas (`/etiquetas`)
- **WHEN** se presiona `G` y luego `C`
- **THEN** la aplicación navega a Completado
- **WHEN** se presiona `G` y luego `A`
- **THEN** la aplicación navega a Hábitos (`/habitos`)

#### Scenario: G E no dispara el alta de evento de la E suelta

- **WHEN** se presiona `G` y, dentro de la ventana del acorde, se presiona `E`
- **THEN** la aplicación navega a Etiquetas
- **AND** NUNCA SHALL abrirse el formulario de alta de un evento de calendario

#### Scenario: La E suelta sigue abriendo el alta de evento

- **WHEN** se presiona `E` sin que haya un acorde pendiente y sin foco en un campo de texto
- **THEN** se abre el formulario de alta de un evento de calendario nuevo

#### Scenario: S abre el buscador

- **WHEN** se presiona `S` estando en la pantalla Hoy, sin foco en un campo de texto
- **THEN** se abre el buscador

#### Scenario: Q abre el alta rápida de tarea

- **WHEN** se presiona `Q` sin foco en un campo de texto
- **THEN** se abre el componente de alta rápida de tarea

#### Scenario: E abre el alta de un nuevo evento de calendario

- **WHEN** se presiona `E` sin foco en un campo de texto
- **THEN** se abre el formulario de alta de un evento de calendario nuevo

### Requirement: El acorde G espera la segunda tecla con un límite de tiempo

Tras presionar `G`, la aplicación SHALL esperar 1,5 segundos a que se presione
una de las teclas del acorde (`I`, `H`, `P`, `E`, `C`, `A`). Mientras el acorde
está pendiente, ninguna tecla suelta SHALL disparar su propio atajo. El acorde
pendiente SHALL cancelarse al presionar `Escape`, al presionar una tecla que
no forma parte del acorde, o al vencerse los 1,5 segundos sin que se presione
ninguna.

#### Scenario: Una tecla ajena al acorde lo cancela sin disparar su propio atajo

- **WHEN** se presiona `G` y, antes de que pase 1,5 segundos, se presiona `Q`
  (que fuera del acorde abre el alta rápida de tarea)
- **THEN** el acorde se cancela y el alta rápida de tarea no se abre

#### Scenario: Escape cancela el acorde pendiente

- **WHEN** se presiona `G` y luego, antes de completar el acorde, se presiona
  `Escape`
- **THEN** el acorde se cancela y no ocurre ninguna navegación

#### Scenario: El acorde se cancela solo si pasan 1,5 segundos sin la segunda tecla

- **WHEN** se presiona `G` y no se presiona ninguna otra tecla durante 1,5
  segundos
- **THEN** el acorde se cancela automáticamente
