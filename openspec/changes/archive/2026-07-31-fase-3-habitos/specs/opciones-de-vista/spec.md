## MODIFIED Requirements

### Requirement: Los controles de hábitos y repeticiones futuras quedan reservados, sin exponerse

La clave de opción para mostrar repeticiones futuras de una tarea recurrente SHALL seguir existiendo en el esquema de opciones persistido, como punto de extensión, pero la barra MUST NOT mostrarla como control interactivo todavía: es una opción del modo calendario, que es fase 4. La clave de opción para mostrar hábitos SHALL exponerse como control interactivo en la barra, en las pantallas donde la barra existe.

#### Scenario: El control de repeticiones futuras sigue sin exponerse

- **WHEN** el usuario abre la barra de opciones de vista en cualquiera de las seis pantallas donde existe
- **THEN** no ve ningún control para mostrar u ocultar repeticiones futuras

#### Scenario: El control de mostrar hábitos es visible

- **WHEN** el usuario abre la barra de opciones de vista
- **THEN** ve un control para mostrar u ocultar hábitos
