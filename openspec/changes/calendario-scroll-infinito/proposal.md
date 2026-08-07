## Why

El calendario navega por páginas: los botones de anterior y siguiente saltan un bloque entero, así que para ver el domingo y el lunes juntos hay que elegir el formato que los contenga, y para mover algo del domingo al lunes hay que cambiar de página en el medio del gesto —o sea, no se puede—. El límite de la página es artificial: el tiempo no viene en semanas cerradas, y el formato debería decir *cuántos días quiero ver*, no *qué recorte fijo estoy mirando*.

## What Changes

- **BREAKING**: en los formatos día, cuatro días y semana, la navegación por páginas se reemplaza por un desplazamiento horizontal continuo, día por día, sin principio ni fin.
- El formato deja de definir un rango anclado y pasa a significar únicamente **cuántas columnas de día entran a la vez** (1, 4 o 7).
- La semana **deja de alinearse** a un día fijo de inicio: siete días seguidos desde donde esté el desplazamiento, de modo que se puede quedar mirando de miércoles a martes.
- Arrastrar un bloque hacia el borde de la vista **desplaza el calendario** mientras se arrastra, de forma que se pueda soltar en un día que no estaba visible al empezar el gesto.
- Los datos de un rango pasan de traerse por página a traerse por **ventana deslizante con prebúsqueda**, para que aparezcan ya cargados al desplazarse.
- Las columnas de día se **virtualizan**: solo se montan las visibles y un margen a cada lado.
- **El formato mes no cambia**: sigue navegando mes a mes, con su grilla de semanas. Los dos modelos conviven, cada uno en la forma para la que es natural.
- "Hoy" pasa a significar *traer el desplazamiento hasta hoy*, y los botones de anterior y siguiente pasan a correr la vista una cantidad de días, no a saltar de página.

## Capabilities

### New Capabilities
- `navegacion-continua-calendario`: el desplazamiento horizontal continuo del calendario —qué se ve, cómo se corre, cómo se vuelve a hoy, cómo se cargan los días que todavía no se vieron y cómo se comporta el arrastre contra el borde.

### Modified Capabilities
- `vista-calendario`: el requisito de los cuatro formatos deja de describir un rango anclado por formato y pasa a describir una cantidad de días visibles, con el mes como excepción explícita. El requisito de arrastre suma el desplazamiento automático contra el borde. Se aprovecha para saldar la deuda de **D51**: hoy el spec no menciona que un hábito se puede redimensionar ni que la duración resultante es del hábito entero.

## Impact

- **Componentes**: `components/calendar/screen-calendar.tsx` (arma los bloques por día visible), `calendar-view.tsx` (el `DndContext` y el estado de arrastre), `time-grid.tsx` (columnas y droppables), `all-day-row.tsx` (tiene que desplazarse en conjunto con la grilla), `calendar-nav.tsx` (los botones cambian de significado), `month-grid.tsx` (sin cambios, pero deja de compartir el modelo de navegación).
- **Geometría y layout**: `components/calendar/grid-metrics.ts` (el ancho de columna deja de derivar de "cuántos días entran en la página"), `lib/calendar/layout.ts` (`visibleDaysForFormat` deja de anclar; el layout por día no cambia).
- **Datos**: `lib/calendar/use-calendar-range-events.ts`, `lib/habits/use-habit-schedule-overrides-range.ts`, `lib/habits/skips.ts`, `lib/habits/completions.ts` — las cuatro consultan por rango visible y necesitan la misma estrategia de ventana.
- **Arrastre**: `@dnd-kit/core` en `calendar-view.tsx` y `draggable-timed-block.tsx`; el autodesplazamiento contra el borde se cruza con el `PointerSensor` y con la selección de rango a mano de `time-grid.tsx`.
- **Preferencias**: el formato recordado por pantalla (`view_preferences`) sigue guardando lo mismo, pero su significado cambia; hay que decidir si se guarda además la posición del desplazamiento.
- **Táctil**: el desplazamiento horizontal compite con el gesto de crear por arrastre sobre el fondo y con el desplazamiento vertical de las 24 horas.
