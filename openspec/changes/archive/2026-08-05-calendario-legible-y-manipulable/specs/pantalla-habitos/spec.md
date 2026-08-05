## ADDED Requirements

### Requirement: Un hábito se puede saltear un día puntual

El usuario SHALL poder saltear un hábito en un día concreto, dejando constancia de que decidió no hacerlo ese día.

Un hábito salteado SHALL seguir mostrándose en el calendario de ese día, marcado como salteado, y NUNCA SHALL desaparecer: saltear es una decisión que queda a la vista, no una baja.

Saltear SHALL ser **reversible**: el usuario SHALL poder completar después ese mismo día, y al hacerlo la racha SHALL actualizarse como en cualquier otro día.

Saltear NUNCA SHALL modificar el cálculo de la racha por sí mismo. La racha SHALL seguir contando cumplimientos, de modo que saltear no suma ni resta: solo deja de estar pendiente.

Saltear SHALL afectar únicamente al día elegido, y NUNCA SHALL modificar la frecuencia del hábito ni su horario habitual.

#### Scenario: Saltear un hábito no lo cuenta como cumplido

- **WHEN** el usuario saltea un hábito en un día
- **THEN** ese día NUNCA SHALL contarse como cumplido
- **AND** el hábito SHALL seguir viéndose en el calendario de ese día, marcado como salteado

#### Scenario: Completar después de saltear actualiza la racha

- **WHEN** el usuario saltea un hábito y más tarde ese mismo día lo completa
- **THEN** SHALL quedar cumplido
- **AND** la racha SHALL actualizarse igual que en cualquier otro día

#### Scenario: Saltear no cambia la frecuencia

- **WHEN** el usuario saltea un hábito en un día
- **THEN** al día siguiente que le corresponda SHALL volver a aparecer normalmente

#### Scenario: Un día salteado se distingue de uno sin hacer

- **WHEN** el usuario mira el registro de un hábito con un día salteado y otro sin hacer
- **THEN** los dos días SHALL distinguirse entre sí
