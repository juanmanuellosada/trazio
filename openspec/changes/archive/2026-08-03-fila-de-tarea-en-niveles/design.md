## Context

La fila de tarea es un único renglón con todo adentro: la casilla de selección, el grip de
arrastre, el chevron, la casilla de completar, el punto de prioridad, un botón que contiene el
título más los chips de etiqueta y la fecha, y el botón de acciones.

El título tiene un tope de ancho propio, puesto a propósito: sin él, en una pantalla ancha la
fecha quedaba lejísimos del título. La sección 5.1 del sistema de diseño cuenta esa historia y
deja una advertencia — si la metadata vuelve a verse lejos, se toca el tope de la fila, **no**
el ancho de la columna.

El botón del título, en cambio, **ya llega al borde derecho**: es elástico y sin tope. Así que
anclar algo a la derecha no exige tocar nada del ancho.

No hay alto fijo en ninguna parte, no hay virtualización, y el arrastre mide al empezar. Crecer
hacia abajo es estructuralmente gratis.

Restricciones que condicionan: **D24** (ninguna acción disponible solo por un gesto), **D27**
(la Bandeja es un proyecto y no tiene color), **D29** (el color puede ser de paleta o
personalizado), y la regla de base de datos que prohíbe consultar de a uno en un bucle.

## Goals / Non-Goals

**Goals:**

- Usar el espacio que la fila ya tiene y desperdicia.
- Saber de dónde viene una tarea cuando la lista cruza proyectos.
- Que la jerarquía entre tareas y secciones se lea.

**Non-Goals:**

- La descripción en la fila.
- El tablero, donde el título mide unos 130 píxeles.
- Tocar el ancho de la columna de contenido.

## Decisions

### D-A. Tres niveles, y cada uno desaparece si está vacío

| Nivel | Qué |
| --- | --- |
| 1 | Casilla, título, y a la derecha proyecto y sección |
| 2 | Fecha y etiquetas |

Y **cada nivel se renderiza solo si tiene contenido**. Una tarea sin fecha ni etiquetas queda
en una línea, igual que hoy.

Eso trae una consecuencia que conviene mirar de frente: **en una misma lista van a convivir
filas de una y de dos alturas.** En la Bandeja, donde el caso más común es un título suelto,
la mayoría va a seguir siendo de una línea y unas pocas de dos. Una lista con alturas
irregulares se lee peor que una pareja, y esa irregularidad es el costo real de esta
propuesta.

*La alternativa descartada* es reservar siempre el segundo nivel. Da una lista prolija y
desperdicia media pantalla de aire en cuanto la mitad de las tareas no tiene nada.

### D-B. El proyecto se decide por pantalla, no por variante

El componente tiene una variante "plana" que se usa en las pantallas que cruzan proyectos, y
es tentador usarla como criterio. **No alcanza**: el tablero de un proyecto y el modo de
agrupar por prioridad dentro de un proyecto también son planos, y en los dos el proyecto
sobraría.

Va una decisión explícita en cada montaje. Son nueve, y es preferible a un criterio que
acierta en siete.

| Muestra proyecto | No muestra |
| --- | --- |
| Hoy, Próximos, Etiqueta, Filtro, Buscador, Completado | Bandeja, Proyecto, sección, subtareas del detalle, tablero de Bandeja y de Proyecto |

### D-C. El chip va al lado del botón del título, nunca adentro

Tres razones, y la primera alcanza:

**El nombre accesible.** El botón toma su nombre de todo su texto descendiente. Con el
proyecto adentro, una tarea llamada "Pagar el alquiler" pasa a llamarse "Pagar el alquiler
Trabajo" para quien navega por teclado o con lector de pantalla — y rompe siete pruebas que
buscan tareas por su nombre.

**No podría ser un enlace.** Un control interactivo dentro de otro está prohibido por las
reglas del proyecto. Si algún día el chip lleva al proyecto, adentro sería imposible.

**La geometría es la misma.** Puesto como hermano, antes del botón de acciones, cae en el
mismo lugar.

### D-D. Las secciones se traen todas de una vez

El nombre de la sección no está disponible fuera de su proyecto. Consultarlas por proyecto
dentro de una lista que cruza proyectos es exactamente el patrón que las reglas prohíben.

Va **una consulta mayorista y cacheada** de todas las secciones del usuario, sembrada como ya
se hace con los proyectos.

**Si al implementarlo esa consulta resulta cara** —muchas secciones, o pesa en el arranque—,
paren y díganlo: mostrar solo el proyecto es una degradación aceptable, y esconder una
consulta lenta detrás de un chip no lo es.

### D-E. Dos pesos de línea, y tres lugares donde no va

La línea entre tareas es **más tenue** que la de sección. Si las dos pesan parecido, una lista
con secciones se lee como una sola tira de renglones y la jerarquía se pierde, que es
justamente lo contrario de lo que se pide.

**No lleva línea**: la última tarea de una lista —no separa nada y queda colgando encima de
"Agregar tarea"—, las subtareas —una tarea con cuatro hijos parecería cinco tareas sueltas, y
el anidado ya se comunica con la sangría—, y una sección colapsada, que ya se resolvió así
hace unas horas por el mismo motivo.

### D-F. El teléfono necesita tratamiento propio, y hoy es el caso peor

En 390 píxeles el botón del título mide unos 216, y una tarea con dos etiquetas y hora deja el
título en 60 u 80. Es el peor caso actual.

**El segundo nivel lo mejora mucho**: la fecha y las etiquetas pasan a tener el ancho entero.
Pero **el proyecto a la derecha lo empeora**: le sacaría al título otros 60 a 100 píxeles.

Ahí hay que resolverlo distinto —bajarlo al segundo nivel, reducirlo, o no mostrarlo— y se
decide mirándolo, no por escrito. Lo que no se puede es dejar el mismo layout y esperar que
entre.

## Risks / Trade-offs

**Alturas irregulares** → D-A, asumido. Es lo que más puede hacer que el resultado se vea peor
que lo que hay, y solo se juzga mirando una lista real con tareas variadas, no tres de prueba.

**Romper el nombre accesible de las tareas** → D-C lo evita. Si igual alguien mete el chip
adentro, el síntoma son siete pruebas rojas, así que se nota.

**Una consulta nueva en el arranque** → D-D, con su salida escrita.

**Contradecir un requisito vigente** → El spec dice que la metadata nunca se pega al borde
derecho, y se escribió con razón: la fecha a mil doscientos píxeles del título era el problema
real de la fase 1. Acá se acota, no se borra: **la fecha y las etiquetas siguen sin pegarse al
borde** —bajan al segundo nivel, pegadas a la izquierda— y el proyecto es la única excepción.

**Una prueba frágil** → Hay una que busca el punto de prioridad con un selector de CSS crudo,
por su forma redonda y por estar oculto a los lectores. Cualquier chip nuevo con esas dos
características la hace fallar.
