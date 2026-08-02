## Context

El editor de repetición tiene cuatro controles: cada cuánto, la frecuencia, cuándo termina y
quitar la repetición. No recibe la fecha de la tarea, así que no puede decir "cada mes el 5".

La función que arma la regla solo produce frecuencia e intervalo. El comentario del archivo
reconoce que si el lenguaje natural trajo una regla con días de la semana, tocar la
frecuencia la destruye.

El ancla —desde qué fecha se cuenta la próxima ocurrencia— se deduce de la forma de la regla,
sin columna. Fue una decisión tomada para no guardar un dato más, y está en el spec como
requisito con dos escenarios.

Lo de terminar la serie ya está entero: modelo, editor y corte.

## Goals / Non-Goals

**Goals:**

- Que las opciones digan algo sobre **esta** tarea, no genéricos.
- Poder pedir combinaciones que hoy son imposibles, como "cada 3 días desde el vencimiento".
- Que tocar el editor no destruya una regla que vino del lenguaje natural.

**Non-Goals:**

- El parser de lenguaje natural, que ya genera reglas completas.
- La generación de la siguiente ocurrencia.
- El fin de la serie, ya implementado.

## Decisions

### D-A. La columna gana, la deducción queda de respaldo

Se agrega una columna para el ancla, que puede quedar vacía.

- **Vacía**: se deduce de la forma de la regla, exactamente como hoy.
- **Con valor**: manda el valor.

Así las tareas existentes no cambian de comportamiento, y la deducción sigue sirviendo para
todo lo que crea el parser sin que nadie elija nada.

*La alternativa descartada* es llenar la columna para todas al migrar, deduciendo el valor
actual. Congela lo que hoy es dinámico: una tarea cuya regla cambie de forma dejaría de
seguir a su regla, sin que nadie lo haya pedido.

### D-B. El editor pasa a generar la regla completa

Hoy solo produce frecuencia e intervalo. Tiene que producir también los días de la semana y
el día del mes, porque sin eso "cada mes el 5" no se puede expresar.

Y eso arregla de paso el destrozo: hoy, editar una tarea cuya regla vino del lenguaje natural
con "cada lunes" le borra el lunes. **Ese arreglo es tan importante como la funcionalidad
nueva**, porque es una pérdida silenciosa de lo que el usuario había pedido.

### D-C. Las opciones rápidas se derivan de la fecha, y hay que decidir qué pasa sin fecha

Los textos salen de la fecha de la tarea: "cada semana el domingo", "cada mes el 5", "cada
año el 5 de abril".

**Una tarea sin fecha no tiene de dónde derivarlos.** Hay que decidir: o las opciones que
dependen de la fecha no se ofrecen, o se ofrecen genéricas. Prefiero lo primero, por el mismo
criterio que se usó en recordatorios: no ofrecer una opción que afirma algo que la tarea no
tiene.

### D-D. El diálogo personalizado se comparte con los eventos, y por eso una parte se oculta

Tareas y eventos necesitan la misma pregunta: cada cuánto, qué días, hasta cuándo. Escribirlo
dos veces garantiza que se separen.

**Con una diferencia real**: elegir desde qué fecha se cuenta tiene sentido en una tarea
—que se completa— y ninguno en un evento, que simplemente ocurre. Esa parte tiene que poder
ocultarse.

Es la razón por la que esta tanda va **antes** que la de eventos.

### D-E. "Después de N veces" se queda

El dueño mostró solo "nunca" y "en una fecha". Trazio tiene además terminar después de N
repeticiones, que ya está implementado y en el spec.

**No se saca.** Nadie pidió sacarlo, funciona, y quitar una opción existente porque no aparece
en una captura de referencia es confundir "no lo mostró" con "no lo quiere".

## Risks / Trade-offs

**Cambiar cómo se arma la regla puede romper tareas recurrentes que andan** → Es el riesgo
mayor. La generación de la siguiente ocurrencia depende de la forma de la regla, y ahora el
editor va a producir formas que antes solo producía el parser. Hay que probar el ciclo
completo: crear, completar, y ver dónde cae la siguiente.

**El ancla y la forma de la regla dejan de estar acopladas** → Eso es lo que se busca, pero
habilita combinaciones que antes eran imposibles y que nadie probó: "cada lunes contado desde
el completado" es legítimo y hay que ver qué hace.

**Las tareas existentes** → Con la columna vacía se siguen deduciendo. Hay que comprobarlo con
tareas reales, no suponerlo.

**Un diálogo compartido entre dos dominios** → Puede terminar con banderas para cada caso. Si
al escribirlo aparecen más de una o dos, es señal de que no eran la misma pregunta.

## Open Questions

- Si el editor sigue teniendo sus cuatro controles sueltos además de las opciones rápidas, o
  si todo lo que no sea rápido se va al diálogo personalizado. Se decide mirándolo.
