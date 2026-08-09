## Why

Una tarea se puede duplicar con todas sus subtareas: `lib/tasks/duplicate.ts`
recorre el subárbol e inserta nodo por nivel. Un proyecto entero, no.

Y hay procesos que se repiten con la misma forma —una mudanza, un viaje, el
cierre de mes— donde armar las mismas quince tareas otra vez es el trabajo que
uno quería evitar. Todoist y TickTick lo resuelven con plantillas; acá la
maquinaria de copiar ya existe y solo le falta el nivel de arriba.

## What Changes

- El menú de un proyecto SHALL ofrecer **Duplicar**, junto a Editar, Archivar
  y Eliminar.
- La copia SHALL incluir el nombre (con un sufijo que la distinga), color,
  ícono, descripción, vista preferida, sus secciones con su descripción, y sus
  tareas con subtareas y etiquetas.
- La copia NUNCA SHALL incluir: tareas completadas, comentarios, recordatorios
  ni el estado de favorito o archivado.
- Las fechas SHALL copiarse tal cual. Esto es **duplicar**, no una plantilla:
  una plantilla que limpia fechas es otra función y merece su propia decisión.
- La copia SHALL quedar al lado del original en el árbol, y SHALL abrirse al
  terminar.

## Capabilities

### Modified Capabilities

- `proyectos-secciones`: el menú del proyecto suma duplicar.

## Impact

**Lógica** — módulo nuevo que orquesta la copia reusando `duplicateTaskTree`
para cada tarea raíz del proyecto. No se reescribe la copia de tareas.

**Interfaz** — el menú de acciones del proyecto, en el encabezado y en el
árbol del panel lateral.

**Datos** — ninguno.

**Fuera de alcance** — plantillas propiamente dichas (con fechas relativas o
limpias), duplicar los subproyectos de un proyecto, y una galería de
plantillas predefinidas.
