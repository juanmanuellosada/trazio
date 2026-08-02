## Context

La fila de tarea tiene hoy un menú de once ítems detrás de un botón de tres puntitos. Ese
botón está oculto hasta que el mouse pasa por encima — en el teléfono se acaba de arreglar
que sea visible, pero en escritorio sigue siendo un descubrimiento.

Ninguna acción del menú resuelve un atributo en el lugar: fecha y prioridad se cambian
abriendo el detalle. Los atajos `T` e `Y`, activos con el menú abierto, hacen exactamente
eso.

La primitiva de menú por clic derecho ya existe, con ítems, separadores y submenús, y su
documentación dice literalmente que cualquier superficie futura con acciones por clic
derecho puede sumarse como segundo consumidor. Hoy la usa solo el editor de descripción.

Restricciones que condicionan: **D24** (ninguna acción disponible solo por un gesto), el
requisito de `alta-de-tareas` de que ninguna superficie tenga su propia implementación de
alta, y **D5** (el rojo de marca no se usa para destructivos genéricos).

## Goals / Non-Goals

**Goals:**

- Que las acciones de una tarea estén donde uno las busca: encima de la tarea.
- Que poner una fecha o una prioridad no exija abrir el detalle.
- Un solo menú, no dos que se van separando.

**Non-Goals:**

- Menú contextual en proyectos, secciones, etiquetas o eventos.
- Rediseñar los selectores de fecha y prioridad.
- Acciones en lote: el menú es de una tarea.

## Decisions

### D-A. Un solo menú para las dos entradas

El clic derecho y el botón de tres puntitos abren **exactamente el mismo** menú.

La alternativa —un menú rico por clic derecho y el de siempre en el botón— es peor de lo
que parece: dos listas que hay que mantener sincronizadas, que van a divergir, y un
usuario que aprende una y no encuentra lo mismo en la otra.

Con esto el botón de tres puntitos deja de ser el único camino, lo cual **refuerza D24** en
vez de tensionarlo: hoy varias acciones dependen de encontrar un botón que solo aparece con
el mouse encima.

### D-B. Qué resuelve el menú en el lugar y qué delega

| En el menú | Delega al detalle o a un diálogo |
| --- | --- |
| Fecha: accesos rápidos y quitar | El selector completo, con "más…" |
| Prioridad: las cuatro | — |
| Fecha límite, recordatorios | Sus selectores, desde el menú |
| Duplicar, mover, subir, bajar, indentar, copiar enlace, eliminar | — |
| Agregar tarea encima y debajo | El alta compartida |

El criterio: **lo que se elige de una lista corta se resuelve en el menú; lo que necesita
un calendario o escribir, se delega.**

Entre los accesos rápidos de fecha faltan dos que no existen hoy: **quitar la fecha** —hoy
es un botón dentro del selector— y **abrir el selector completo**. Los dos hay que
agregarlos a esa fila.

### D-C. `T` e `Y` cambian de significado, y es una mejora

Hoy, con el menú abierto, `T` abre el detalle con el selector de fecha enfocado e `Y` con
el de prioridad. Pasan a **abrir la fila rápida correspondiente dentro del menú**.

Es un cambio de comportamiento observable: quien los usaba terminaba en el detalle y ahora
se queda en el menú. Va a favor del usuario —el detalle era un rodeo para poner una
fecha— pero hay que anotarlo como cambio, no colarlo.

El resto de los atajos del menú no se toca.

### D-D. Agregar encima y debajo usan el alta compartida

Son superficies de alta nuevas y el spec es explícito: **ninguna superficie tiene
implementación propia**. Ya se violó una vez —el alta del calendario fue una
implementación paralela hasta hoy— y no conviene repetirlo.

Abren el alta embebida, con el contexto de la tarea de referencia: su proyecto, su sección
y su padre si lo tiene. La posición se calcula con las primitivas que ya existen.

**Y por la propuesta de hoy sobre subtareas**: si la tarea de referencia es una subtarea,
la nueva también lo es, y entonces **no se muestra selector de destino**.

### D-E. El clic derecho no se secuestra donde el navegador hace falta

Sobre un enlace, sobre texto seleccionado o dentro de un campo de edición, el clic derecho
tiene que seguir dando el menú del navegador: copiar, pegar, abrir en pestaña nueva.

Es fácil de romper poniendo el manejador en el contenedor de la fila y olvidando que el
título es editable en algunas superficies. Hay que probarlo, no razonarlo.

### D-F. Eliminar se ve destructivo sin usar el rojo de marca

La primitiva ya soporta marcar un ítem como destructivo, y el menú actual ya lo usa. Se
mantiene. **D5** prohíbe usar el rojo de marca para destructivos genéricos, así que no se
copia el rojo de la referencia.

## Risks / Trade-offs

**Un menú largo se vuelve difícil de recorrer** → Con todo lo de hoy más lo nuevo son
bastantes ítems. Los separadores y el orden importan más que en un menú corto, y eso se
juzga mirándolo.

**Cambiar el significado de dos atajos** → D-C, anotado.

**Romper el clic derecho del navegador** → D-E. Es el error más probable y el más molesto:
alguien que quiere copiar un texto y recibe un menú de tarea.

**Los ítems del menú dependen de la superficie** → Varios ítems ya se ocultan según dónde
esté la fila. Al sumar acciones hay que decidir lo mismo para cada una, y es fácil que una
quede disponible donde no tiene sentido.

**El gate en verde no prueba nada acá** → Es un menú: se verifica abriéndolo con las dos
entradas, en cada superficie, y apretando cada atajo.

## Open Questions

- Si "editar" merece un atajo propio, como muestra la referencia. Agregar un atajo global
  exige revisar colisiones en las tres capas del sistema de atajos, así que se decide al
  implementar y solo si la letra está libre.
