## Context

El sistema de recordatorios ya distingue puntuales de relativos: guarda el instante
calculado y, en los relativos, el desfase. Un disparador en la base recalcula el instante
cuando la tarea cambia de hora, y hace algo más agresivo cuando la tarea **se queda sin
hora**: borra los relativos pendientes.

El selector ya tiene las dos pestañas y once opciones de desfase. Cuando la tarea no tiene
hora, la pestaña relativa no ofrece nada y muestra un texto pidiendo que se le ponga una.

Todo eso cumple el spec, que prohíbe explícitamente los relativos sobre tareas sin hora.
Esta propuesta levanta esa prohibición.

Restricciones que condicionan: la preferencia de zona horaria ya existe; el veto escrito a
recordatorios por email; y la regla de que las políticas de RLS se escriben en la migración
que crea la tabla — acá no aplica, porque las tablas ya existen.

## Goals / Non-Goals

**Goals:**

- Que una tarea con solo día pueda tener un aviso "un día antes" que signifique algo.
- Que el selector ofrezca **solo** lo que tiene sentido para esa tarea.
- Que mover la tarea siga moviendo sus avisos, también cuando la tarea tiene solo día.

**Non-Goals:**

- Recordatorios sobre tareas sin ninguna fecha, que siguen siendo solo puntuales.
- Recalcular lo ya agendado al cambiar la preferencia.
- Tocar la entrega: el trabajo periódico y la función de envío quedan igual.
- Recordatorios por email.

## Decisions

### D-A. La hora de referencia es una preferencia, no una constante

Podría fijarse una hora en el código y listo. Se descarta: la hora a la que alguien
considera que "vence" un día es personal, y una constante obligaría a cambiar código para
algo que es una preferencia.

Va en la sección de notificaciones de la configuración, que pasa a llamarse
**"Notificaciones y recordatorios"**. Es del dueño la propuesta y es la correcta: esa
sección hoy solo tiene el permiso de push, y sumarle esto le da cuerpo en vez de crear una
sección nueva para un campo.

Se guarda como **hora de reloj**, no como instante. El momento real se resuelve
combinándola con el día de la tarea y la zona horaria del usuario, que ya es una
preferencia existente.

### D-B. Las opciones son dinámicas, y "a la hora de la tarea" es el caso especial

| La tarea tiene | Qué se ofrece |
| --- | --- |
| Fecha y hora | Todas las opciones, incluida "a la hora de la tarea" |
| Solo fecha | Las de desfase, calculadas desde la hora de referencia |
| Ni fecha | Ninguna relativa; solo puntual |

**"A la hora de la tarea" no se ofrece cuando la tarea no tiene hora**, aunque haya hora de
referencia. Y la distinción es fina pero importante: para un desfase, la hora de referencia
es una convención razonable —"un día antes" necesita alguna hora y la de referencia es tan
buena como cualquiera—. Pero "a la hora de la tarea" **afirma** algo sobre la tarea, y si
la tarea no tiene hora, esa afirmación es falsa: estaría avisando a una hora inventada
diciendo que es la de la tarea.

Es lo que pidió el dueño: que las opciones sean dinámicas según lo que se haya elegido en
la fecha.

### D-C. Cambiar la preferencia no reescribe lo ya agendado

La preferencia se lee **cada vez que se calcula** un momento de aviso: al crear el
recordatorio y al recalcularlo porque la tarea cambió de día. **No** dispara una
reescritura de los recordatorios existentes.

Decisión del dueño, tomada con la rareza a la vista: un recordatorio creado con la hora
vieja la conserva hasta que la tarea cambie de día, y ahí se recalcula con la nueva. Queda
una mezcla temporal.

*La alternativa descartada* —recalcular todo al guardar la preferencia— es más predecible,
pero significa que tocar un ajuste te mueve avisos que ya habías puesto. Cambiar un valor
por defecto no debería reescribir decisiones ya tomadas.

### D-D. El disparador se amplía a los cambios de día, y hay que revisar el borrado

Hoy el disparador escucha los cambios de hora. Con relativos sobre tareas de solo día, eso
no alcanza: cambiar el día no movería el aviso.

Y hay algo más delicado. Hoy, cuando una tarea **se queda sin hora**, el disparador
**borra** sus relativos pendientes. Ese comportamiento tenía sentido cuando quedarse sin
hora equivalía a quedarse sin referencia. Con esta propuesta ya no: una tarea con solo día
sigue teniendo referencia, la de la preferencia.

**Ese borrado hay que revisarlo**, y es el punto donde este cambio puede destruir datos del
usuario en silencio. El criterio: **sacarle la hora a una tarea no debería borrar sus
recordatorios**, sino recalcularlos contra la hora de referencia. Borrarlos solo tiene
sentido si la tarea se queda **sin ninguna fecha**.

### D-E. Una tarea sin ninguna fecha sigue admitiendo solo recordatorios puntuales

No hay nada de qué colgar un desfase. La pestaña relativa no ofrece opciones y lo explica;
la puntual funciona como siempre.

## Risks / Trade-offs

**El borrado del disparador puede tirar recordatorios del usuario** → Es el riesgo más
serio y es de datos, no de interfaz. Hoy sacarle la hora a una tarea borra sus relativos.
Si el cambio se hace a medias —se amplía el recálculo pero no se revisa el borrado— alguien
que le saca la hora a una tarea pierde avisos que ahora sí se podrían conservar. Hay que
probar exactamente ese camino.

**La mezcla temporal de D-C** → Aceptada y anotada. Si molesta al usarla, la salida es
recalcular al guardar la preferencia, que es la alternativa ya descartada por escrito.

**Zona horaria** → La hora de referencia es hora de reloj y el día es una fecha sin zona.
Resolverlos a un instante pasa por la zona del usuario, y equivocarse ahí da avisos con
horas de diferencia. Es el tipo de error que no se ve en un test que corra en la misma zona
que la preferencia.

**Levantar una prohibición explícita** → El spec decía "NUNCA SHALL" con un motivo real. El
motivo se resuelve con la hora de referencia; lo que no se resuelve —"a la hora de la
tarea" sin hora— queda prohibido igual, por D-B.

## Open Questions

- Qué hora conviene como valor inicial de la preferencia. Se elige mirando qué es razonable
  para el dueño, no por escrito.
