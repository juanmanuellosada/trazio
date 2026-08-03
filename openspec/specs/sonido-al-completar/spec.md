# sonido-al-completar Specification

## Purpose
TBD - created by archiving change sonido-al-completar. Update Purpose after archive.
## Requirements
### Requirement: Suena una confirmación al completar una tarea o marcar un hábito

Al completar una tarea o al marcar un hábito como hecho, la aplicación SHALL reproducir un
sonido corto de confirmación, siempre que el usuario no lo haya apagado.

El sonido SHALL ser una confirmación de que la acción ocurrió, NUNCA una celebración:
SHALL ser un único evento sonoro breve, y NUNCA SHALL variar según la racha, la prioridad,
la cantidad de tareas completadas ni ninguna otra medida de desempeño. La aplicación
organiza, no arenga.

El sonido SHALL generarse en el navegador, sin depender de un archivo de audio ni de una
librería externa.

#### Scenario: Completar una tarea suena

- **WHEN** el usuario completa una tarea desde la casilla de su fila, en cualquier vista
- **THEN** SHALL reproducirse el sonido de confirmación

#### Scenario: Completar desde el detalle suena igual

- **WHEN** el usuario completa una tarea desde el modal de detalle
- **THEN** SHALL reproducirse el mismo sonido

#### Scenario: Marcar un hábito suena

- **WHEN** el usuario marca un hábito como hecho
- **THEN** SHALL reproducirse el sonido de confirmación

#### Scenario: El sonido no cambia con la racha ni con la cantidad

- **WHEN** el usuario completa varias tareas seguidas, o marca un hábito con una racha
  larga
- **THEN** el sonido SHALL ser siempre el mismo
- **AND** NUNCA SHALL escalar, encadenarse ni variar según el desempeño

### Requirement: El sonido solo acompaña la acción del propio usuario

El sonido SHALL dispararse únicamente como resultado confirmado de una acción que el
usuario acaba de hacer en este dispositivo. La aplicación NUNCA SHALL reproducirlo por
observar un cambio en los datos.

Descompletar una tarea SHALL sonar, con la **misma duración, la misma envolvente y el mismo
volumen** que completarla, y una **nota más grave**. NUNCA SHALL ser una secuencia de notas
ni un acorde: sigue siendo un único evento sonoro, igual que el de completar.

Desmarcar un hábito NUNCA SHALL sonar. Marcar un hábito suena porque no tiene deshacer y el
sonido es la única confirmación de que el clic llegó; desmarcarlo es la corrección de un
error y no necesita confirmarse con el mismo peso.

#### Scenario: Descompletar una tarea suena, más grave

- **WHEN** el usuario marca como pendiente una tarea que estaba completada
- **THEN** SHALL reproducirse un sonido de la misma duración y forma que el de completar
- **AND** SHALL ser de una nota más grave
- **AND** NUNCA SHALL ser una secuencia de notas

#### Scenario: Desmarcar un hábito no suena

- **WHEN** el usuario desmarca un hábito que había marcado
- **THEN** NUNCA SHALL reproducirse ningún sonido

#### Scenario: Deshacer no suena

- **WHEN** el usuario completa una tarea y a continuación deshace esa acción
- **THEN** NUNCA SHALL reproducirse ningún sonido al deshacer

#### Scenario: Lo completado en otro dispositivo no suena

- **WHEN** el usuario completa una tarea en otro dispositivo y este recibe el cambio por
  sincronización en tiempo real
- **THEN** NUNCA SHALL reproducirse ningún sonido en este dispositivo

#### Scenario: Lo descompletado en otro dispositivo tampoco suena

- **WHEN** el usuario descompleta una tarea en otro dispositivo y este recibe el cambio por
  sincronización en tiempo real
- **THEN** NUNCA SHALL reproducirse ningún sonido en este dispositivo

#### Scenario: Una acción que falla no suena

- **WHEN** el usuario completa una tarea y la operación falla, revirtiéndose
- **THEN** NUNCA SHALL reproducirse ningún sonido

#### Scenario: Guardar la descripción no suena

- **WHEN** el usuario edita la descripción de una tarea y esta se autoguarda
- **THEN** NUNCA SHALL reproducirse ningún sonido, aunque el guardado atraviese el mismo
  camino que completar

### Requirement: El sonido nunca bloquea ni interrumpe la acción

Reproducir el sonido NUNCA SHALL formar parte del camino crítico de completar. Si el
navegador impide reproducirlo, la aplicación SHALL fallar en silencio y completar la tarea
o el hábito igual.

#### Scenario: El navegador bloquea la reproducción

- **WHEN** el navegador impide reproducir audio
- **THEN** la tarea o el hábito SHALL completarse normalmente
- **AND** NUNCA SHALL mostrarse un error al usuario por no haber podido sonar

### Requirement: Ajuste para apagar el sonido al completar o descompletar

La sección General de la configuración SHALL seguir ofreciendo el interruptor para apagar el
sonido, que ya existía desde que se sumó el sonido al completar una tarea o marcar un hábito.
La preferencia SHALL guardarse en las preferencias del usuario y SHALL venir encendida.

Ese interruptor SHALL cubrir también, sin sumar uno nuevo, el sonido de descompletar: NUNCA
SHALL existir un ajuste separado para él, que es la otra cara de la misma acción.

#### Scenario: Apagar el sonido silencia también el de descompletar

- **WHEN** el usuario apaga el interruptor y luego descompleta una tarea
- **THEN** NUNCA SHALL reproducirse ningún sonido

#### Scenario: No hay un segundo interruptor

- **WHEN** el usuario abre la sección General de la configuración
- **THEN** SHALL haber un único interruptor de sonido

