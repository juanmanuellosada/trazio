## MODIFIED Requirements

### Requirement: Ciclo de vida completo de una tarea

Una tarea SHALL poder crearse, editarse, completarse, descompletarse, duplicarse,
moverse de proyecto o sección, reordenarse, eliminarse, y SHALL poder copiarse su
enlace directo. La creación SHALL resolverse siempre a través del componente de
alta rico definido por la capacidad `alta-de-tareas` —con título, descripción y
accesos a fecha, prioridad, fecha límite y proyecto destino—: este requisito no
repite esos campos, solo exige que crear una tarea pase por ese componente y
quede con al menos un título. Completar una tarea que tiene `recurrence_rule`
SHALL además disparar la generación automática de su siguiente ocurrencia,
según la mecánica de herencia, ancla y fin de serie que define la capacidad
`tareas-recurrentes`; este requisito solo establece que ese disparo forma
parte del ciclo de vida de completar, no repite esa mecánica.

#### Scenario: Crear una tarea desde el componente de alta

- **WHEN** se confirma la creación de una tarea desde el componente de alta
  definido por `alta-de-tareas`, indicando al menos un título
- **THEN** la tarea queda creada, pendiente, en el proyecto de destino indicado
  (o en la Bandeja de entrada si no se indicó ninguno)

#### Scenario: Editar los campos de una tarea

- **WHEN** se edita el título, la descripción, la prioridad, la fecha de
  vencimiento, la duración estimada o la fecha límite de una tarea existente
- **THEN** la tarea queda actualizada con los nuevos valores

#### Scenario: Completar y descompletar una tarea

- **WHEN** se marca una tarea pendiente como completada
- **THEN** su `completed_at` deja de ser `null`
- **WHEN** se descompleta esa misma tarea
- **THEN** su `completed_at` vuelve a ser `null`

#### Scenario: Completar una tarea recurrente dispara la generación de la siguiente ocurrencia

- **WHEN** se completa una tarea que tiene `recurrence_rule`
- **THEN** además de quedar completada, se dispara la generación de su
  siguiente ocurrencia, según el comportamiento que define la capacidad
  `tareas-recurrentes`

#### Scenario: Mover una tarea de proyecto o de sección

- **WHEN** se mueve una tarea a otro proyecto, o a otra sección dentro del mismo
  proyecto
- **THEN** la tarea queda ubicada en el proyecto y la sección de destino

#### Scenario: Reordenar una tarea

- **WHEN** se cambia el orden de una tarea respecto de las demás tareas de su
  mismo contexto (misma sección o mismo nivel de subtareas)
- **THEN** la tarea queda en la nueva posición

#### Scenario: Eliminar una tarea

- **WHEN** se elimina una tarea que tiene subtareas
- **THEN** la tarea y todas sus subtareas se borran físicamente

#### Scenario: Copiar el enlace directo de una tarea

- **WHEN** se usa la acción "copiar enlace directo" sobre una tarea
- **THEN** se copia una URL que apunta a `app/(app)/tarea/[id]` con el `id` de esa
  tarea

## ADDED Requirements

### Requirement: Una tarea tiene un hilo de comentarios y cero o más recordatorios, ambos en cascada

Una tarea SHALL poder tener un hilo de comentarios (tabla `comments`) y cero
o más recordatorios (tabla `reminders`), ambos asociados por `task_id`. Al
eliminar una tarea, SHALL eliminarse en cascada todos sus comentarios y todos
sus recordatorios.

#### Scenario: Una tarea nueva no tiene comentarios ni recordatorios

- **WHEN** se crea una tarea nueva
- **THEN** nace sin ningún comentario y sin ningún recordatorio, ambos opcionales

#### Scenario: Eliminar una tarea elimina sus comentarios en cascada

- **WHEN** se elimina una tarea que tiene comentarios en su hilo
- **THEN** todos esos comentarios se eliminan junto con la tarea

#### Scenario: Eliminar una tarea elimina sus recordatorios en cascada

- **WHEN** se elimina una tarea que tiene recordatorios configurados
- **THEN** todos esos recordatorios se eliminan junto con la tarea

## REMOVED Requirements

### Requirement: Capacidades fuera de alcance de tareas en fase 1

**Reason**: Todas las exclusiones que fijaba este requisito para fase 1 pasan
a implementarse en esta fase: los comentarios, los recordatorios, la
ejecución de la recurrencia al completar, y la selección múltiple con
deshacer sobre las vistas de tareas.
**Migration**: Comentarios y recordatorios quedan cubiertos por las
capacidades `comentarios` y `recordatorios-push` (incluida la cascada al
eliminar una tarea, que este mismo archivo agrega como requisito propio de
`tareas`); la ejecución de la recurrencia al completar, por el requisito
modificado "Ciclo de vida completo de una tarea" de esta misma capacidad y
por la nueva capacidad `tareas-recurrentes`; la selección múltiple y el
deshacer, por las nuevas capacidades `seleccion-multiple` y `deshacer`. La
mención a que la administración de etiquetas, la página propia por etiqueta
y las favoritas quedaban fuera de fase 1 ya no aplica: son historia resuelta
por D34 y por la capacidad `navegacion-por-etiqueta` de esta fase.
