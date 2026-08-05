## ADDED Requirements

### Requirement: Un hábito se puede saltear un día puntual

El usuario SHALL poder saltear un hábito en un día concreto, dejando constancia de que ese día no corresponde hacerlo.

Saltear NUNCA SHALL contarse como cumplido, y NUNCA SHALL equivaler a no haberlo hecho: son tres estados distintos —pendiente, cumplido y salteado— y confundirlos vuelve inútil el registro.

El efecto sobre la racha SHALL ser explícito y estar escrito, y NUNCA SHALL quedar librado a lo que resulte del cálculo existente.

Saltear SHALL afectar únicamente al día elegido, y NUNCA SHALL modificar la frecuencia del hábito ni su horario habitual.

#### Scenario: Saltear un hábito no lo cuenta como cumplido

- **WHEN** el usuario saltea un hábito en un día
- **THEN** ese día NUNCA SHALL contarse como cumplido

#### Scenario: Saltear no cambia la frecuencia

- **WHEN** el usuario saltea un hábito en un día
- **THEN** al día siguiente que le corresponda SHALL volver a aparecer normalmente

#### Scenario: Un día salteado se distingue de uno sin hacer

- **WHEN** el usuario mira el registro de un hábito con un día salteado y otro sin hacer
- **THEN** los dos días SHALL distinguirse entre sí
