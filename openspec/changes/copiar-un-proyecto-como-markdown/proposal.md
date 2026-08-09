## Why

Un proyecto ya se puede copiar como enlace de lectura para mostrarlo, y una
tarea ya se puede copiar como enlace directo. Falta la salida más chica y más
común de todas: llevarte el contenido de un proyecto como texto, para
pegarlo en una nota, un chat o un documento, sin abrir el proyecto compartido
ni escribirlo de nuevo a mano.

Es barato precisamente porque no es exportar: no queda un archivo, no hay
formato versionado que sostener, no hay camino de vuelta. Es el portapapeles,
con el proyecto entero serializado en markdown en vez de una URL (D60).

## What Changes

- El menú "…" del header del proyecto SHALL ofrecer "Copiar como markdown".
- La acción SHALL dejar en el portapapeles: nombre y descripción del
  proyecto; cada sección con su descripción; las tareas y subtareas
  anidadas; la descripción de cada tarea (jsonb de Tiptap convertido a
  markdown); y por tarea su fecha de vencimiento, prioridad (solo si no es
  la default), duración estimada y etiquetas.
- Una tarea o subtarea completada SHALL marcarse `- [x]`; una pendiente,
  `- [ ]`.
- La estructura SHALL ser siempre la canónica: primero las tareas sin
  sección, después cada sección por su `position`, subtareas anidadas por
  `position` — NUNCA SHALL depender de los filtros rápidos, el agrupador ni
  el orden que tenga puestos la barra de opciones de vista.
- La Bandeja de entrada NUNCA SHALL ofrecer la acción: su menú de acciones
  directamente no se renderiza, igual que ya pasa con "Editar", "Duplicar",
  "Compartir", "Archivar" y "Eliminar".

## Capabilities

### Modified Capabilities

- `proyectos-secciones`: el menú del proyecto suma "Copiar como markdown".

## Impact

**Frontend únicamente** — sin migración, sin cambio de esquema, sin RLS
nueva. El costo está en tres módulos nuevos bajo `lib/`: conversión de
Tiptap a markdown, armado del documento del proyecto, y la escritura al
portapapeles con el manejo de gesto de usuario que exige WebKit.

**Consulta de red nueva** — las descripciones de las tareas no están en el
caché de ninguna lista existente (`TASK_LIST_COLUMNS` no las trae) y hay que
buscarlas puntualmente al copiar.

**Fuera de alcance** — descargar un archivo `.md`; ofrecer la acción desde
el menú contextual del árbol lateral (`components/layout/project-tree.tsx`);
copiar una tarea sola como markdown; atajo de teclado; importar markdown de
vuelta a la app; y, de los metadatos de una tarea, la fecha límite
(`deadline`) y la recurrencia — quedan fuera de lo que se copia.
