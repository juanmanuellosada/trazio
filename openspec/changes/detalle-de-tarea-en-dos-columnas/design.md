## Context

`components/tasks/task-detail-content.tsx` es hoy una sola columna: cabecera fija con
checkbox, título y menú; y debajo un cuerpo desplazable donde lo primero es una fila de
selectores que se envuelve —proyecto, prioridad, vencimiento, fecha límite,
recordatorios— y después repetición, etiquetas, descripción, subtareas y comentarios.

`components/tasks/task-detail-panel.tsx` lo monta en un diálogo centrado de 672px en
escritorio y en una hoja a pantalla completa en teléfono. Eso es **D28** y está cumplido.

El único precedente de dos columnas en un modal es el de configuración: flexbox con un
lateral de ancho fijo y colapso a una columna en pantallas chicas. Pero ahí el lateral es
navegación, no atributos.

Restricciones que condicionan: **D28** (modal centrado, sin redimensionar, pantalla
completa en teléfono), **D12** (sin estado global), **D30** (sin fórmula matemática en la
descripción), y la convención del sistema de diseño de que **el ancho de un diálogo es una
variante con nombre**, no una clase suelta en el consumidor.

## Goals / Non-Goals

**Goals:**

- Que se distinga de un vistazo lo que la tarea dice de lo que la tarea es.
- Que el contenido no quede empujado hacia abajo por una fila de atributos que envuelve.
- Que en teléfono siga funcionando igual de bien que hoy.

**Non-Goals:**

- Cambiar qué campos tiene el detalle, o qué hacen.
- Navegación anterior y siguiente entre tareas.
- Tocar la ruta de la tarea suelta.
- Reemplazar los selectores compartidos por otros propios: el spec de
  `selectores-de-atributos` exige que sean los mismos que usa el alta.

## Decisions

### D-A. Contenido a la izquierda, atributos a la derecha

| Columna | Qué va |
| --- | --- |
| **Izquierda** | Título, descripción, subtareas, comentarios |
| **Derecha** | Proyecto, fecha, fecha límite, prioridad, etiquetas, recordatorios, repetición |

El criterio de reparto es ese, y conviene tenerlo escrito porque los casos dudosos se
resuelven con él: **a la izquierda lo que el usuario escribe, a la derecha lo que el
usuario elige.**

Por eso repetición va a la derecha aunque hoy esté suelta en el medio: es un atributo que
se elige de un selector, no algo que se redacta.

La columna izquierda es la que crece y la que desplaza. La derecha es una lista de
atributos: si crece tanto que necesita desplazarse por su cuenta, es señal de que hay
demasiados, no de que falte una barra de desplazamiento.

### D-B. El ancho es una variante con nombre del diálogo

El modal mide hoy 672px. Para dos columnas hace falta más.

**No se pone una clase de ancho en el consumidor.** El sistema de diseño fija que el
ancho del diálogo es una variante con nombre, y ya hay varias. Se agrega la que
corresponda y el detalle la pide por nombre.

`docs/design-system.md` enumera las variantes existentes y esa lista **ya quedó corta
respecto del código** antes de este cambio. Al sumar una, se deja la sección al día — si
no, la próxima persona vuelve a poner una clase suelta porque el documento no le ofrece
la variante que necesita.

### D-C. En teléfono no hay dos columnas, y no es una degradación

Debajo del punto de corte, el detalle sigue siendo una sola columna a pantalla completa,
como hoy.

Y ahí el orden importa: **los atributos van después del título y antes de la descripción**,
no al final. En una sola columna, mandar los atributos al fondo obliga a desplazarse
hasta abajo para cambiar una fecha, que es de las cosas más frecuentes. La disposición de
dos columnas no puede empeorar el teléfono.

### D-D. Los envoltorios con referencia no se tocan

Este es el riesgo real de la tanda y merece una decisión propia.

Siete atajos del detalle —fecha, fecha límite, prioridad, recordatorios, proyecto,
etiquetas, subtareas— funcionan pulsando el disparador que está dentro de un contenedor
con referencia. **Mover un bloque de una columna a la otra es seguro mientras su
envoltorio siga envolviendo lo mismo.** Fusionar dos bloques, o sacar un `div` que parecía
sobrar, los rompe.

Y el de subtareas además **busca el botón por su texto literal**. Ese texto no puede
cambiar en esta tanda.

Ninguno de los dos fallos hace ruido: el atajo simplemente deja de hacer algo. Se
verifican apretando las siete teclas, una por una.

### D-E. Ni navegación entre tareas ni Ubicación

La referencia muestra flechas de anterior y siguiente. No existen, nadie las pidió, y
para hacerlas habría que meter el orden visual de cada vista dentro del contexto del
detalle —que hoy solo sabe qué tarea está abierta—. Es otra propuesta.

La referencia muestra también **Ubicación**, que ahí es geolocalización y no existe en el
modelo de Trazio. Cuidado con la trampa de vocabulario: el spec de Trazio llama
"ubicación" al proyecto y la sección de la tarea, que sí están y ya van en la columna
derecha.

## Risks / Trade-offs

**Romper un atajo sin darse cuenta** → Es el riesgo principal. Lo ataca D-D, y se
verifica apretando las siete teclas. Un test de render no lo ve.

**Un modal más ancho aprieta el fondo en pantallas medianas** → Hay que mirarlo en un
ancho intermedio, no solo en uno grande y en el teléfono. El punto donde dos columnas
dejan de entrar es el que hay que encontrar.

**La columna derecha puede quedar desbalanceada** → Con una tarea sin etiquetas, sin
recordatorios y sin repetición, la derecha queda casi vacía mientras la izquierda tiene
descripción y comentarios. Es el caso más común, no el raro: hay que mirarlo así antes de
darlo por bueno.

**El gate en verde no prueba nada acá** → Es enteramente visual y de gestos.

## Open Questions

- En qué ancho exacto conviene colapsar a una columna. El punto de corte del teléfono
  puede quedar corto: dos columnas pueden dejar de entrar bien antes de eso. Se resuelve
  mirándolo.
