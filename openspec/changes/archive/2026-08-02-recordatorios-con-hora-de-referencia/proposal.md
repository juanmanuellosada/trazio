## Why

Los recordatorios relativos funcionan y están completos: el modelo guarda el desfase, un
disparador en la base recalcula el aviso cuando la tarea cambia de hora, y el selector
ofrece las dos modalidades con once opciones.

Pero **exigen que la tarea tenga hora**. Si tiene solo día, el selector te dice que le
pongas una. El dueño quiere lo contrario: *"dependiendo de si seleccioné fecha o fecha con
hora me salen opciones x horas antes, x días antes, y así"* — que las opciones sean
dinámicas según lo que la tarea tenga.

Eso no es un ajuste de interfaz: está prohibido por escrito. El spec dice que un relativo
*"NUNCA SHALL poder crearse sobre una tarea sin hora"*.

Y tiene un motivo real detrás, no es un capricho del spec: **un día antes de una fecha sin
hora no existe**. Un día antes del 5 de agosto a las 00:00 son las 00:00 del 4, que no
sirve como aviso. Hace falta una hora de referencia, y hoy no hay ninguna.

## What Changes

**Una hora de referencia configurable**

- Preferencia nueva: a qué hora se considera que vence una tarea que solo tiene día.
- Vive en la sección de notificaciones de la configuración, que pasa a llamarse
  **"Notificaciones y recordatorios"** — hoy solo tiene el permiso de push.

**Los relativos funcionan sobre tareas con solo fecha**

- Las opciones disponibles **dependen de lo que la tarea tenga**:

| La tarea tiene | Opciones relativas |
| --- | --- |
| Fecha y hora | Todas, incluida "a la hora de la tarea" |
| Solo fecha | Las de desfase, calculadas desde la hora de referencia |
| Ni fecha | Ninguna: solo se puede poner un recordatorio puntual |

- **"A la hora de la tarea" no se ofrece si la tarea no tiene hora.** Sería avisar a una
  hora inventada diciendo que es la de la tarea.

**El recálculo se amplía**

- Hoy el disparador escucha los cambios de hora. Pasa a escuchar también los de día, o un
  relativo sobre una tarea con solo fecha nunca se movería al cambiarle el día.

**Cambiar la hora de referencia no reescribe lo ya agendado**

- La preferencia se usa cada vez que se calcula el momento del aviso: al crearlo y al
  recalcularlo. Cambiarla **no** sale a mover recordatorios existentes.
- Decisión del dueño, con su rareza asumida: un recordatorio viejo mantiene la hora con la
  que se creó hasta que la tarea cambie de día.

Sin pérdida de datos. Los recordatorios existentes siguen igual.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `recordatorios-push`: se levanta la prohibición de crear relativos sobre tareas sin
  hora, con una hora de referencia; las opciones ofrecidas pasan a depender de lo que la
  tarea tenga; y el recálculo cubre también los cambios de día.
- `configuracion`: la sección Notificaciones pasa a llamarse "Notificaciones y
  recordatorios" y suma el ajuste de la hora de referencia.

## Impact

**Datos.** Columna nueva en las preferencias del usuario para la hora de referencia. Las
políticas de RLS **no se tocan**: son por fila y ya cubren cualquier columna.

**Base.** El disparador de recálculo hay que ampliarlo para que escuche los cambios de día
además de los de hora, y para que resuelva la hora de referencia cuando la tarea no tenga
hora propia. Hoy además **borra** los relativos pendientes cuando la tarea se queda sin
hora — ese comportamiento hay que revisarlo, porque con esta propuesta quedarse sin hora
ya no significa quedarse sin referencia.

**Zona horaria.** Ya existe una preferencia de zona horaria. La hora de referencia se
guarda como hora de reloj y el instante se resuelve combinándola con el día de la tarea y
esa zona.

**Código.** El selector de recordatorios pasa a decidir qué ofrece según lo que la tarea
tenga. El cálculo del momento del aviso deja de rechazar las tareas sin hora. La sección
de configuración cambia de nombre y suma un campo.

**Documentación.** El modelo de datos y la descripción de la sección de configuración.

**Fuera de alcance.** Recordatorios por email, descartados por escrito. Recordatorios sobre
tareas sin ninguna fecha, que siguen siendo solo puntuales. Recalcular los recordatorios
existentes al cambiar la preferencia.
