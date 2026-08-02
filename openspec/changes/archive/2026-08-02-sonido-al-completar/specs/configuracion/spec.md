## ADDED Requirements

### Requirement: Ajuste para apagar el sonido al completar

La sección General de la configuración SHALL ofrecer un interruptor para apagar el sonido
que suena al completar una tarea o marcar un hábito. La preferencia SHALL guardarse en las
preferencias del usuario y SHALL venir encendida.

#### Scenario: Apagar el sonido lo silencia en todas las superficies

- **WHEN** el usuario apaga el interruptor y luego completa una tarea o marca un hábito,
  desde cualquier vista
- **THEN** NUNCA SHALL reproducirse ningún sonido

#### Scenario: Volver a encenderlo lo restablece

- **WHEN** el usuario vuelve a encender el interruptor y completa una tarea
- **THEN** SHALL reproducirse el sonido de confirmación

#### Scenario: La preferencia sobrevive a recargar

- **WHEN** el usuario cambia el interruptor y recarga la aplicación
- **THEN** el interruptor SHALL conservar el valor elegido

#### Scenario: Un usuario nuevo lo tiene encendido

- **WHEN** un usuario que nunca tocó ese ajuste completa una tarea
- **THEN** SHALL reproducirse el sonido
