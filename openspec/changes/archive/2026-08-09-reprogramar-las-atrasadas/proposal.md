## Why

El bloque de atrasadas es lo primero que ves en Hoy, en rojo, arriba de todo.
Y es lo único de esa pantalla que no ofrece hacer nada con el conjunto: para
correr diez tareas vencidas a hoy hay que entrar al modo de selección,
seleccionarlas una por una o todas, abrir el menú de fecha y elegir Hoy.

Todoist pone un "Reprogramar" en el encabezado de ese mismo bloque, porque es
el gesto más repetido de cualquier persona que abre su lista a la mañana.

Todas las piezas están: la selección múltiple ya cambia fechas en lote y esas
acciones ya son deshacibles como una sola.

## What Changes

- El encabezado del bloque de atrasadas SHALL ofrecer reprogramarlas todas,
  sin pasar por el modo de selección.
- SHALL ofrecer al menos Hoy y Mañana, y elegir otra fecha.
- SHALL alcanzar exactamente a las atrasadas **que se están viendo**: si hay
  un filtro rápido activo, no toca las que ese filtro dejó afuera.
- SHALL ser **deshacible como una sola acción**, igual que el resto de las
  acciones en lote. NUNCA SHALL pedir confirmación: con deshacer disponible, un
  diálogo estorba en la acción más frecuente del día.
- El conteo SHALL decirse antes de aplicar: "Reprogramar 12".

## Capabilities

### Modified Capabilities

- `vistas-lista`: el bloque de atrasadas suma su acción de conjunto.

## Impact

**Interfaz** — el encabezado del bloque de atrasadas en Hoy.

**Lógica** — reusa la mutación de cambio de fecha en lote que ya usa
`components/selection/selection-action-bar.tsx`, y su integración con
deshacer. Sin lógica nueva.

**Datos** — ninguno.

**Fuera de alcance** — reprogramar desde Próximos (las atrasadas viven en su
propio bloque fuera de la ventana y ahí el gesto no es diario), reprogramación
inteligente que reparta las tareas en varios días, y cambiar cómo se muestran
las atrasadas.
