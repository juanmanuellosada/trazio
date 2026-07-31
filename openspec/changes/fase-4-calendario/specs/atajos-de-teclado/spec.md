## MODIFIED Requirements

### Requirement: Atajos generales de navegación y acceso rápido

La aplicación SHALL registrar, disponibles desde cualquier pantalla, el acorde `G` seguido de `I` (Bandeja de entrada), `T` (Hoy), `U` (Próximos), `C` (Completado) o `A` (Hábitos); `S` para abrir el buscador; `Q` para abrir el alta rápida de tarea; `E` para abrir el alta de un nuevo evento de calendario; y `Ctrl/Cmd+Z` para deshacer. `G A` SHALL navegar a la pantalla de Hábitos (`/habitos`). `E` SHALL abrir el formulario de alta de un evento de calendario nuevo.

#### Scenario: El acorde G navega según la segunda tecla

- **WHEN** se presiona `G` y, dentro de la ventana del acorde, se presiona `I`
- **THEN** la aplicación navega a la Bandeja de entrada
- **WHEN** se presiona `G` y luego `T`
- **THEN** la aplicación navega a Hoy
- **WHEN** se presiona `G` y luego `U`
- **THEN** la aplicación navega a Próximos
- **WHEN** se presiona `G` y luego `C`
- **THEN** la aplicación navega a Completado
- **WHEN** se presiona `G` y luego `A`
- **THEN** la aplicación navega a Hábitos (`/habitos`)

#### Scenario: S abre el buscador

- **WHEN** se presiona `S` estando en la pantalla Hoy, sin foco en un campo de texto
- **THEN** se abre el buscador

#### Scenario: Q abre el alta rápida de tarea

- **WHEN** se presiona `Q` sin foco en un campo de texto
- **THEN** se abre el componente de alta rápida de tarea

#### Scenario: E abre el alta de un nuevo evento de calendario

- **WHEN** se presiona `E` sin foco en un campo de texto y sin el detalle de una tarea abierto
- **THEN** se abre el formulario de alta de un evento de calendario nuevo

### Requirement: G A y E (nuevo evento) apuntan a pantallas de fases posteriores

`G A` SHALL navegar a la pantalla de Hábitos (`/habitos`), construida en la fase 3. El atajo general `E` SHALL abrir el formulario de alta de un evento de calendario nuevo, construido en esta fase.

#### Scenario: G A navega a la pantalla de Hábitos

- **WHEN** se presiona `G` y luego `A` dentro de la ventana del acorde
- **THEN** la aplicación navega a `/habitos`

#### Scenario: E como atajo general abre el alta de un nuevo evento

- **WHEN** se presiona `E` sin el detalle de una tarea abierto y sin foco en un campo de texto
- **THEN** se abre el formulario de alta de un evento de calendario nuevo
