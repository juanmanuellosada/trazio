## ADDED Requirements

### Requirement: Contexto de atajos de la lista

Una pantalla con forma de ver lista SHALL registrar un contexto de atajos propio con las
teclas del cursor: `↑`, `↓`, `Inicio`, `Fin`, `Enter`, `Espacio`, `X`, `.`, `⇧F10`,
`⇧↑` y `⇧↓`.

Ese contexto SHALL resolverse con la misma pila de contextos que ya existe: el binding
más específico gana. Con el detalle de una tarea o un menú abierto, las teclas del
cursor NUNCA SHALL dispararse, porque el contexto más específico está por encima.

Las teclas del cursor son teclas sueltas y por lo tanto NUNCA SHALL dispararse con el
foco en un campo de texto, con una única excepción: `↑` y `↓` dentro de un campo mueven
el cursor de texto, no el de la lista, que es el comportamiento nativo del campo.

#### Scenario: El detalle abierto gana sobre el cursor

- **WHEN** el detalle de una tarea está abierto y se presiona `↓`
- **THEN** el cursor de la lista de atrás NUNCA SHALL moverse

#### Scenario: Las flechas escriben en un campo de texto

- **WHEN** el foco está en el campo del alta rápida y se presiona `↑`
- **THEN** el cursor de texto se mueve dentro del campo
- **AND** el cursor de la lista NUNCA SHALL moverse

#### Scenario: X no se dispara escribiendo

- **WHEN** el foco está en un campo de texto y se presiona `X`
- **THEN** se escribe la letra `x` y NUNCA SHALL seleccionarse ninguna tarea
