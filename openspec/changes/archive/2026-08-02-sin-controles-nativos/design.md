## Context

El proyecto tiene componentes propios de fecha y hora, buenos: un calendario dibujado a
mano sin librería, un cuerpo compartido con parser de lenguaje natural en vivo y accesos
rápidos, y un bloque de hora con opciones predefinidas más entrada libre que respeta el
formato de 12 o 24 horas del usuario.

Y tiene tres lugares que no los usan y delegan en el navegador. Uno de ellos —el editor de
eventos— dejó escrito en un comentario que copió el criterio del selector de recordatorios.

El requisito que lo prohíbe existe desde hace tiempo y está bien redactado para lo que
cubría: los tres selectores de atributos de una tarea. El problema es que se leyó como una
lista cerrada.

## Goals / Non-Goals

**Goals:**

- Que no quede ningún lugar donde elegir una fecha o una hora abra el control del sistema.
- Que la regla no se pueda volver a esquivar por no estar en una lista.
- Que el selector de recordatorios se vea como se pidió.

**Non-Goals:**

- Cambiar qué guardan esos controles.
- La lógica de recordatorios, recién hecha.
- Rediseñar el editor de eventos más allá de sacarle los nativos.

## Decisions

### D-A. Se amplía la regla, no se parchan los casos

Arreglar los tres lugares y dejar el requisito como está garantiza que aparezca un cuarto:
es exactamente lo que pasó, y con un comentario que citaba al anterior como precedente.

La regla pasa a decir que **ninguna superficie** donde el usuario elige una fecha o una
hora usa un control nativo. Deja de ser una lista de tres.

### D-B. El bloque de hora hay que poder usarlo desde afuera

El cuerpo del selector de fecha ya está pensado para compartirse. El bloque de hora **no**:
vive dentro del selector de vencimiento, que escribe en los campos de una tarea.

Hay que poder usarlo desde el recordatorio y desde el evento. Cómo —extraerlo, o
parametrizar el que hay— se decide mirando cuánto arrastra: si sacarlo obliga a mover la
mitad del selector de vencimiento, es señal de que conviene parametrizar.

**Lo que no se puede hacer es copiarlo.** Sería un tercer lugar donde vive la misma lógica
de horas y formato, y la próxima corrección tocaría dos de tres.

### D-C. El recordatorio: dos modos, uno de ellos con desplegable

Los dos modos hoy son dos botones que cambian de color. Pasan a ser una elección explícita
entre **fecha y hora fija** y **relativo a la tarea**.

En el modo relativo, la grilla de once botones pasa a un **desplegable**, que es lo que
mostró el dueño. Con once opciones que además ahora cambian según lo que la tarea tenga, un
desplegable se lee mejor que una grilla que se reordena sola.

El modo fijo usa el calendario propio más el bloque de hora.

### D-D. El fin de la recurrencia y el editor de eventos: solo se les saca lo nativo

En esos dos no se rediseña nada más. El editor de eventos tiene su propia propuesta y meter
mano ahí desde acá sería pisarla.

## Risks / Trade-offs

**Ampliar la regla puede descubrir más casos** → Es el punto. Si al buscar aparece un
cuarto, se arregla; si aparecen cinco, hay que decir cuáles entran en esta tanda y cuáles
no, en vez de estirarla en silencio.

**El bloque de hora arrastra más de lo que parece** → Maneja formato de 12 y 24 horas,
opciones predefinidas y entrada libre tipeada con su propio error. Sacarlo mal rompe el
selector de vencimiento, que es de los controles más usados de la aplicación.

**Un desplegable con opciones que cambian** → En el modo relativo las opciones dependen de
si la tarea tiene hora. Un desplegable que cambia de contenido mientras está abierto es
confuso: hay que ver qué pasa si la fecha de la tarea cambia con el selector abierto.

**El gate no prueba nada de esto** → Que no haya un control nativo sí se puede testear
—buscando ese tipo de campo en lo renderizado— y conviene hacerlo, porque es justo la
clase de deuda que vuelve.
