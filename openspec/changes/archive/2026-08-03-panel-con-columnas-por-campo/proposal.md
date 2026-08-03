## Why

El modo panel quedó a mitad de camino. Sus columnas están **cableadas por pantalla** —secciones en
Bandeja y Proyecto, días en Próximos— y el agrupador de la barra de opciones, que existe y ofrece
prioridad y etiqueta, **no las toca**. Son dos formas de agrupar que se ignoran entre sí.

El dueño lo pidió así: *"en el modo panel, el agrupador es por lo que se muestra cada columna. O sea
si yo no agrupo por nada, las columnas se muestran por secciones. Si yo pongo por fecha las columnas
son las fechas disponibles. Y así con cada campo."*

Y con eso, cinco cosas que hoy lo hacen incómodo de usar:

- **El título entra en una línea de unos 125 píxeles**, o sea unos dieciséis caracteres antes de
  cortarse. La tarjeta es la fila de tarea con el título truncado.
- **La tarjeta arrastrada desaparece al salir del panel** en vez de seguir al puntero.
- **El tablero se detiene en 1152 píxeles** aunque la pantalla sea mucho más ancha, así que entran
  tres columnas y un pedazo de la cuarta.
- **No hay forma de agregar una tarea a una columna**, ni de crear una sección desde el panel.
- El atajo para agregar sección **existe y no hace nada** en modo panel, en silencio.

## What Changes

**El agrupador define las columnas**

| Agrupar por | Columnas |
| --- | --- |
| Nada | Lo natural de la pantalla: secciones en Bandeja y Proyecto, días en Próximos |
| Sección | Una por sección, más "Sin sección" |
| Fecha | Los días con tareas, más "Sin fecha" |
| Prioridad | Las cuatro, fijas |

Mover una tarjeta entre columnas **escribe el campo que las define**. Hoy solo escribe sección o
fecha, y solo en las dos pantallas que lo tienen cableado.

**El arrastre sigue al puntero**

La tarjeta arrastrada pasa a dibujarse en una capa superpuesta fuera del recorte del tablero. Hoy se
arrastra el nodo original y **tres contenedores lo recortan**, así que desaparece al cruzar el borde.

**La tarjeta muestra dos líneas de título**, y el tablero usa el ancho real de la pantalla en vez de
detenerse en el tope de la columna de contenido.

**Cada columna ofrece agregar una tarea**, con el campo de esa columna ya puesto. Y cuando las
columnas son secciones, el panel ofrece **crear una sección**.

**BREAKING** de contrato: el spec dice hoy que las columnas son las secciones en Bandeja y Proyecto
y los días en Próximos, y que el arrastre solo se habilita **sin agrupación** — que es justamente lo
contrario de lo que se pide.

**Fuera de alcance, con motivo**

- **Agrupar por etiqueta en el panel.** Una tarea puede tener varias, así que aparecería repetida en
  varias columnas y mover dejaría de tener un significado único. Decisión del dueño: *"creo que
  agrupar por etiquetas no debería estar disponible en el modo panel, así no genera confusión"*. En
  la lista sigue igual que hoy.
- **Agrupar por proyecto.** Mover una tarea de proyecto arrastra a todos sus descendientes, les
  borra la sección y obliga a recalcular la posición, que no es comparable entre proyectos (**D25**).
  Merece su propia decisión, y ya existe un camino para eso.
- **Arrastrar en el teléfono.** No hay sensor táctil en ninguna parte de la aplicación y falta la
  propiedad que lo habilita. Es una carencia real, anterior a esto y de alcance más amplio.

## Capabilities

### Modified Capabilities

- `modo-panel`: las columnas dejan de estar cableadas por pantalla y pasan a salir del agrupador; el
  arrastre deja de requerir "sin agrupación" y pasa a escribir el campo de la columna; se suman
  agregar tarea por columna y crear sección; la tarjeta y el ancho cambian.
- `opciones-de-vista`: el agrupador suma "sección" y "fecha" a sus valores.

## Impact

**El agrupador deja de ser el mismo en las dos formas de ver.** En lista sigue ofreciendo etiqueta;
en panel no. Eso obliga a decidir qué pasa con una preferencia ya guardada en "etiqueta" cuando el
usuario cambia a panel — el valor persiste y hay que resolverlo sin perderlo.

**Un defecto de marcado ya conocido.** El tablero envuelve la fila de tarea en un elemento de lista,
y la fila ya devuelve uno: quedan dos anidados, que es inválido y venía dando un error al hidratar.
Se arregla acá porque se toca esa línea.

**Escribir el campo tiene trampas por campo.** Mover por fecha hoy **borra la hora** de la tarea sin
avisar. Mover por sección exige que la sección sea del mismo proyecto, o la escritura falla en la
base.

**El ancho choca con una decisión vigente.** **D39** fijó que la columna de contenido se centra
siempre; el panel necesita salirse de ese tope para mostrar más columnas. Es una excepción, y hay
que escribirla como tal.

**Red de seguridad: no hay.** El tablero **no tiene una sola prueba** —no existe archivo de pruebas
para él ni para las dos pantallas que lo montan—, y **ninguna prueba de punta a punta cambia la
forma de ver a panel**. Se está por reescribir la parte menos cubierta de la aplicación.

**Dos cosas que hoy están mal y conviene arreglar de paso**: una columna vacía dice "Sin tareas.",
que no cumple la regla de estados vacíos del proyecto; y en Hoy, agrupando por prioridad o etiqueta
sin tareas, el tablero queda **en blanco** porque nadie cubre el caso de cero columnas.

**El spec de `modo-panel` ya estaba desactualizado** antes de esto: sigue diciendo que Hoy no ofrece
el modo panel, cuando se agregó hoy.
