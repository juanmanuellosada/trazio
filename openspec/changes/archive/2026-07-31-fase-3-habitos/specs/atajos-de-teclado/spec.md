## MODIFIED Requirements

### Requirement: Atajos generales de navegación y acceso rápido

La aplicación SHALL registrar, disponibles desde cualquier pantalla, el acorde `G` seguido de `I` (Bandeja de entrada), `T` (Hoy), `U` (Próximos), `C` (Completado) o `A` (Hábitos); `S` para abrir el buscador; `Q` para abrir el alta rápida de tarea; `E` para abrir el alta de un nuevo evento de calendario; y `Ctrl/Cmd+Z` para deshacer. `G A` SHALL navegar a la pantalla de Hábitos (`/habitos`). `E` SHALL registrarse igual que el resto de los atajos de este requisito, pero NO SHALL navegar ni abrir nada en esta fase: el alta de eventos de calendario es de fase 4.

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

### Requirement: G A y E (nuevo evento) apuntan a pantallas de fases posteriores

`G A` SHALL navegar a la pantalla de Hábitos (`/habitos`), que esta fase construye. El atajo general `E` de nuevo evento de calendario SHALL seguir registrándose y SHALL responder a la combinación de teclas sin producir un error, pero NO SHALL navegar ni abrir nada en esta fase: el alta de eventos de calendario es de fase 4.

#### Scenario: G A navega a la pantalla de Hábitos

- **WHEN** se presiona `G` y luego `A` dentro de la ventana del acorde
- **THEN** la aplicación navega a `/habitos`

#### Scenario: E como atajo general no abre nada todavía

- **WHEN** se presiona `E` sin el detalle de una tarea abierto y sin foco en un campo de texto
- **THEN** la combinación se reconoce como válida y no produce ningún error, pero no se abre ningún alta de evento
