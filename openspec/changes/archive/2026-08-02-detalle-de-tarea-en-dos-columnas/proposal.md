## Why

El dueño pidió que al abrir una tarea para editarla salga *"con modal en el medio de la
pantalla con este estilo"*, con una referencia que muestra dos columnas: a la izquierda
el título, la descripción, las subtareas y los comentarios; a la derecha una barra con
los atributos.

**La mitad del pedido ya está hecha.** El detalle ya es un modal centrado en escritorio y
pantalla completa en teléfono —lo fija **D28** y el código la cumple— y el doble clic
sobre el título ya lo abre.

Lo que falta es la disposición interna. Hoy es **una sola columna**: los seis selectores
—proyecto, prioridad, vencimiento, fecha límite, recordatorios— están arriba, en una fila
que se envuelve, y debajo van repetición, etiquetas, descripción, subtareas y
comentarios. En un modal de 672px de ancho, esa fila envuelve casi siempre, y el
contenido de la tarea queda empujado hacia abajo.

Separar el contenido de sus atributos es lo que hace que un detalle se lea: a la
izquierda lo que la tarea *dice*, a la derecha lo que la tarea *es*.

## What Changes

**El detalle se organiza en dos columnas en escritorio**

- Izquierda: título, descripción, subtareas y comentarios.
- Derecha: proyecto, fecha, fecha límite, prioridad, etiquetas, recordatorios y
  repetición.
- **En teléfono sigue siendo una sola columna**, a pantalla completa, como hoy.

**El modal se ensancha**

- Hoy mide 672px, que alcanzaba para una columna y no alcanza para dos.
- Se agrega una **variante de ancho con nombre** al componente de diálogo, que es la
  convención del sistema de diseño, en vez de una clase suelta en el consumidor.

**Nada cambia de lo que el detalle hace**

- Los mismos campos, los mismos selectores compartidos, el mismo autoguardado.
- Los siete atajos del detalle siguen funcionando igual.

Sin cambios de datos. Sin cambios de contrato de los selectores.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tareas`: el detalle pasa a organizarse en dos columnas en escritorio —contenido a la
  izquierda, atributos a la derecha— y a colapsar a una sola columna en pantallas
  angostas.

## Impact

**Código.** `components/tasks/task-detail-content.tsx` concentra todo el cambio: es un
único bloque en columna que se reparte en dos. `components/tasks/task-detail-panel.tsx`
pasa a pedir la variante de ancho nueva. `components/primitives/dialog.tsx` suma esa
variante.

**Riesgo puntual, y es el que más cuidado necesita.** Los siete atajos del detalle
—fecha, fecha límite, prioridad, recordatorios, proyecto, etiquetas, subtareas—
funcionan pulsando el disparador que está dentro de un contenedor con referencia.
Reordenar los bloques es seguro **mientras esas referencias sigan envolviendo lo mismo**;
eliminar o fusionar envoltorios los rompe. Y el de subtareas además **busca por el texto
literal del botón**, así que ese texto no puede cambiar.

**Documentación.** `docs/design-system.md` describe hoy las variantes de ancho del
diálogo con una lista que ya quedó corta respecto del código. Al sumar una hay que dejar
esa sección al día.

**Fuera de alcance.** La navegación anterior y siguiente entre tareas, que aparece en la
referencia y no existe en Trazio: es funcionalidad nueva, exigiría meter el orden visual
de cada vista en el contexto del detalle, y nadie la pidió. **Ubicación**, que en la
referencia es geolocalización y no existe en el modelo — ojo que el spec de Trazio usa
esa palabra para el proyecto y la sección de la tarea, que sí están. La ruta de la tarea
suelta, que es otra superficie y no se toca.
