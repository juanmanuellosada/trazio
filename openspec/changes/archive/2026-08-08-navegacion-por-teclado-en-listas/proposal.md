## Why

Trazio tiene veinticinco atajos y ninguna forma de moverse por la lista. Se
puede saltar a Hoy con `G H`, abrir el buscador con `S` y crear una tarea con
`Q` — y después hay que agarrar el mouse para tocar cualquiera de las tareas
que aparecieron. Es la mitad de un teclado.

Lo que hace que Things y Todoist se sientan rápidos no es la cantidad de
atajos: es que hay un cursor. Una fila señalada que se mueve con las flechas
y sobre la que actúan las teclas. Sin eso, cada atajo termina en el mismo
lugar —la mano en el mouse— y el resto del sistema de atajos no se
aprovecha.

## What Changes

- Las listas SHALL tener un **cursor**: una fila señalada que se mueve con
  `↑` y `↓`, visible y distinta de la selección múltiple.
- `Enter` abre el detalle de la fila señalada. `Espacio` la completa o la
  descompleta.
- `⇧↑` y `⇧↓` extienden la selección múltiple que ya existe, reusando su
  ancla. `X` marca o desmarca la fila señalada.
- `.` abre el menú de acciones sobre la fila señalada — y con eso **todos
  los atajos del menú contextual que ya existen** (fecha, prioridad, mover,
  copiar enlace, eliminar) pasan a alcanzarse sin mouse, sin agregar un solo
  atajo nuevo por atributo.
- `Inicio` y `Fin` van a la primera y la última fila.
- El cursor recorre la lista **como se ve**: respeta el orden, la agrupación,
  las secciones colapsadas y las subtareas plegadas. Lo que no se ve, no se
  recorre.
- El cursor SHALL implementarse con foco real del navegador (roving
  tabindex), no con un resaltado decorativo: quien navega con lector de
  pantalla o con `Tab` tiene que llegar al mismo lugar.
- Disponible en Bandeja, Hoy, Próximos, Proyecto, Etiqueta y Filtro — las
  mismas pantallas donde ya vive la selección múltiple.

## Capabilities

### New Capabilities

- `cursor-de-lista`: qué es el cursor, cómo se mueve, qué teclas actúan
  sobre él, cómo convive con la selección múltiple y con el foco del
  navegador, y qué pasa cuando la lista cambia debajo.

### Modified Capabilities

- `atajos-de-teclado`: suma el contexto de lista a la pila de contextos y las
  teclas nuevas, y resuelve su colisión con los atajos generales de una tecla
  suelta.
- `seleccion-multiple`: la selección pasa a poder activarse y extenderse por
  teclado, no solo con clic y `⇧`clic.

## Impact

**Lógica** — reducer propio para el cursor, del mismo estilo que
`lib/selection/reducer.ts`: estado puro, testeable sin DOM. Necesita la
lista aplanada de ids **en el orden en que se ven**, que hoy cada pantalla
arma por su cuenta.

**Atajos** — `lib/shortcuts/` no cambia de arquitectura: el contexto de
lista se empuja a la pila que ya existe (`useShortcutScope`). Sí hay que
revisar la guarda de foco: el cursor pone el foco real en una fila, y una
fila no es un campo de texto, así que las teclas sueltas siguen
disparándose — pero el alta rápida en línea sí es un input y tiene que
seguir bloqueándolas.

**Componentes** — `components/tasks/task-row.tsx` y los contenedores de
lista (`task-group-list.tsx` y las vistas de cada pantalla) suman semántica
de `listbox`/`option` y el roving tabindex.

**Fuera de alcance** — el panel y el calendario (una grilla de dos ejes es
otro problema), el teléfono (no hay teclado), atajos nuevos por atributo
sobre la fila señalada (el menú con `.` ya los alcanza), y reordenar con el
teclado.
