## Context

`components/tasks/hoy-view.tsx` arma `overdue` con las tareas vencidas, ya
pasadas por los filtros rápidos y el orden activos, y las pinta en su propio
bloque.

`components/selection/selection-action-bar.tsx` ya tiene el cambio de fecha en
lote con Hoy, Mañana y Sin fecha, y el spec de `seleccion-multiple` dice que
"las acciones en lote son deshacibles como una sola acción".

## Goals / Non-Goals

**Goals:** un toque para correr las atrasadas, sin entrar al modo de selección.

**Non-Goals:** repartir las tareas entre varios días, reprogramar desde
Próximos, y cambiar la presentación del bloque.

## Decisions

### D-A — Alcanza a lo que se ve, no a lo que hay

Si hay un filtro rápido activo —prioridad, etiqueta, fecha límite—, el bloque
muestra un subconjunto. La acción tiene que tocar **ese** subconjunto.

Es la única lectura defendible: una acción de conjunto en un encabezado se
entiende como "esto que estoy mirando". Tocar tareas que el filtro escondió
sería mover cosas que la persona no vio, y en una acción sobre diez o veinte
tareas eso no se detecta hasta mucho después.

Por eso el botón dice el número: "Reprogramar 12" hace verificable el alcance
antes de tocarlo.

### D-B — Sin confirmación, con deshacer

El patrón de Trazio para lo destructivo es confirmar; el de las acciones en
lote es deshacer. Esta es del segundo tipo: no borra nada, y es la acción más
frecuente de la mañana. Un diálogo en el gesto que más se repite es fricción
pura.

El toast de deshacer ya existe y las acciones en lote ya se revierten como una
sola. Se reusa tal cual.

### D-C — Hoy y Mañana directas, el resto en el selector

Hoy es el 90% de los casos y tiene que ser un toque. Mañana es el segundo.
Cualquier otra fecha pasa por el selector que ya existe.

No se ofrece "Sin fecha" acá, aunque el lote lo permita: sacarle la fecha a una
tarea vencida la hace desaparecer de Hoy sin dejar rastro, que es lo contrario
de lo que alguien quiere al ordenar su día. Sigue disponible desde la selección
múltiple para quien lo busque.

## Risks / Trade-offs

**[Mover doce tareas de un toque puede asustar]** → D-A y el conteo en el
botón: se sabe cuántas antes. Y D-B: se deshace con un toque.

**[La acción aparece incluso con una sola atrasada]** → Con una, el modo de
selección tampoco molestaba. Pero esconderla bajo un umbral la hace
impredecible, y el costo de tenerla siempre es una fila en un encabezado.
