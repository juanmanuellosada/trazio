## Context

El tablero es **un solo archivo de 166 líneas** sin ninguna prueba. Recibe columnas ya armadas y dos
funciones para escribir; quien decide qué es una columna es cada pantalla, por su cuenta.

Hechos del código que condicionan todo:

**No hay capa superpuesta ni portal.** Se arrastra el nodo original, con una transformación. El
contenedor del tablero tiene desplazamiento horizontal, y en CSS eso **también recorta en vertical**.
Encima hay otros dos contenedores que recortan. Por eso la tarjeta desaparece al salir del panel: no
es un modificador restrictivo —no hay ninguno instalado—, es recorte.

**La tarjeta es la fila de tarea** con una variante, no un componente propio. En una columna de 288
píxeles, entre casilla de selección, manija, hueco de chevron, casilla de completar y botón de
acciones se van unos 104, y al título le quedan unos 125. Corta en una línea.

**El agrupador ya existe** y devuelve grupos con clave y rótulo. Lo usan las listas. El tablero lo
ignora salvo en Hoy.

**El arrastre está apagado** salvo con orden manual y sin agrupación — condición que este cambio
invierte.

Restricciones: **D25** (la posición no es comparable entre proyectos), **D27** (la Bandeja es un
proyecto), **D39** (la columna de contenido se centra siempre), **D41** (la fila crece en niveles).

## Goals / Non-Goals

**Goals:**

- Que el agrupador decida las columnas, en todas las pantallas con panel.
- Que el arrastre se vea donde está el puntero.
- Que se pueda agregar sin salir del panel.
- Que entren más columnas en una pantalla ancha.

**Non-Goals:**

- Agrupar por etiqueta en el panel.
- Agrupar por proyecto.
- Arrastrar en el teléfono.
- Que el panel muestre eventos: eso ya se decidió que no.
- Tocar la fila de tarea de las listas.

## Decisions

### D-A. "Nada" significa lo natural de la pantalla, no "una sola columna"

El agrupador tiene un valor "nada" que en las listas quiere decir *no agrupes*. En el panel un
tablero de una sola columna no es un tablero.

Así que **"nada" es lo natural de cada pantalla**: secciones en Bandeja y Proyecto, días en Próximos.
Es exactamente lo que hacen hoy, así que quien no toque nada no ve ningún cambio — y es lo que el
dueño describió: *"si yo no agrupo por nada, las columnas se muestran por secciones"*.

Los demás valores son explícitos y valen igual en cualquier pantalla.

*La alternativa descartada* es renombrar "nada" a algo como "lo de siempre". Cambia el rótulo en las
listas, donde hoy es correcto, para arreglar una ambigüedad que solo existe en el panel.

### D-B. El panel no ofrece agrupar por etiqueta

Una tarea puede tener varias etiquetas, así que aparecería **repetida en varias columnas** y mover
dejaría de significar una sola cosa. Decisión del dueño: *"creo que agrupar por etiquetas no debería
estar disponible en el modo panel, así no genera confusión"*.

**En la lista sigue igual que hoy**, donde ver una tarea bajo cada una de sus etiquetas es
razonable: no hay nada que arrastrar ni ningún campo que escribir.

Esto **elimina una pieza entera** que la versión anterior de este diseño necesitaba. Como la tarjeta
podía aparecer dos veces, había que darle una identidad de arrastre compuesta por columna y tarea;
con etiqueta fuera, **cada tarea cae en exactamente una columna** y el identificador de la tarea
alcanza. Si algún día se reconsidera, esa identidad compuesta es el requisito previo.

**Queda algo que resolver igual**: el agrupador se guarda por pantalla y es el mismo control en las
dos formas de ver. Alguien puede tener "etiqueta" guardado desde la lista y pasar a panel. El valor
**no se pisa** —volver a la lista tiene que encontrarlo intacto—; el panel lo trata como si fuera
"nada".

*La alternativa descartada* es guardar un agrupador por forma de ver. Duplica un ajuste para
resolver un choque que ocurre una vez.

### D-C. Qué escribe mover, campo por campo

| Columnas por | Escribe | Cuidado |
| --- | --- | --- |
| Sección | La sección, más la posición | La base **rechaza** una sección de otro proyecto. Solo tiene sentido dentro de un proyecto |
| Fecha | La fecha de vencimiento | Hoy **borra la hora** sin avisar. Debe conservarla |
| Prioridad | La prioridad | Dominio cerrado de cuatro, sin sorpresas |

Los tres son de **cardinalidad uno**: una tarea tiene una sección, una fecha y una prioridad. Por eso
mover significa una sola cosa y la tarjeta vive en una sola columna. Es la misma razón por la que
etiqueta queda afuera (**D-B**).

### D-D. La tarjeta arrastrada se dibuja fuera del tablero

Una capa superpuesta, en un portal al cuerpo del documento. Es la corrección estándar y la única que
resuelve **las tres capas de recorte** a la vez; ensanchar el tablero o cambiar el desbordamiento
solo corre el problema una capa más afuera.

Hace falta además guardar cuál es la tarjeta activa al empezar, que hoy no se guarda porque nadie la
necesitaba.

### D-E. El panel se sale del tope de ancho, y es una excepción a D39

La columna de contenido se detiene en 1152 píxeles y se centra. Para una lista eso es lo correcto:
una línea de texto muy larga se lee peor. **Un tablero no es una línea de texto**: cada columna tiene
su propio ancho corto, y el tope solo recorta cuántas se ven a la vez.

En modo panel el contenido **ocupa el ancho disponible**. Es una excepción acotada a una forma de
ver, no una revisión de D39: en lista y en calendario nada cambia.

Las columnas mantienen su ancho; lo que cambia es cuántas entran.

### D-F. Agregar, desde la columna

**Agregar tarea** va al pie de cada columna, con el campo de esa columna ya puesto: la sección si las
columnas son secciones, la fecha si son fechas, y así. El componente de alta ya existe y ya recibe
todo eso; en la lista de Próximos ya se usa exactamente así.

**Agregar sección** aparece **solo cuando las columnas son secciones** —con el agrupador en "nada"
dentro de un proyecto, o en "sección"—. En un tablero por prioridad, crear una sección no crea una
columna, y ofrecerlo sería mentir sobre lo que va a pasar.

Hoy ese control existe pero es privado de su módulo, y **el atajo de teclado que lo invoca queda
muerto en modo panel, sin decir nada**. Se arregla junto.

### D-G. Lo que está roto y se arregla porque se toca

**Dos elementos de lista anidados**: el tablero envuelve la fila en uno y la fila ya devuelve otro.
Es marcado inválido y venía dando un error al hidratar.

**La columna vacía dice "Sin tareas."**, que no explica qué va a aparecer ahí ni ofrece con qué
empezar, contra la regla de estados vacíos del proyecto. Con el alta por columna, la acción ya está.

**Cero columnas deja la pantalla en blanco**: pasa en Hoy agrupando por prioridad o etiqueta sin
tareas, porque la guarda de vacío solo cubre la rama de lista.

## Risks / Trade-offs

**Se reescribe lo menos probado de la aplicación.** El tablero no tiene una sola prueba, las dos
pantallas que lo montan tampoco, y ninguna prueba de punta a punta cambia la forma de ver a panel.
Todo lo que se rompa acá **no lo va a atajar el gate**. Es el riesgo principal y no se mitiga con
cuidado: se mitiga escribiendo pruebas antes de tocar.

**Mover escribe datos de verdad.** Un arrastre que cae en la columna equivocada cambia la prioridad,
la fecha o las etiquetas de una tarea real. Es distinto de reordenar, que es cosmético.

**Agrupar por fecha genera tantas columnas como días con tareas.** Con tareas repartidas en meses,
son decenas. Hay que decidir el límite mirándolo.

**El ancho completo puede verse peor, no mejor.** En una pantalla muy ancha, tres columnas de 288
píxeles con un vacío enorme a la derecha es un resultado posible y feo. Hay que mirarlo con pocas
columnas, no solo con muchas.
