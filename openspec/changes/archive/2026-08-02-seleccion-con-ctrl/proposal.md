## Why

El dueño pidió *"un selector múltiple, con ctrl click se seleccionan las tareas"*, y mostró la
barra de acciones con fecha, mover, **etiquetas**, prioridad y un menú de más.

La selección múltiple existe y funciona: hay casilleros propios, rango con `Shift`, salida con
`Escape` y barra de acciones. Faltan dos cosas.

**`Ctrl`+clic hoy no hace nada.** Es un clic normal, así que abre el detalle. El único
modificador implementado es `Shift`, para rango. Entrar al modo exige encontrar el casillero
de selección, que **está oculto hasta que pasás el cursor por encima** — el mismo problema de
descubrimiento que ya arreglamos en el botón de acciones.

**No se pueden poner etiquetas en lote.** Es la ausencia más clara de la barra: mover,
prioridad, fecha y eliminar están; etiquetas no. Y es de las cosas que más sentido tienen en
lote — etiquetar diez tareas de a una es exactamente el trabajo que la selección múltiple
viene a evitar.

## What Changes

**`Ctrl`+clic sobre una tarea la selecciona**

- Sin tener que encontrar el casillero.
- Convive con lo que ya hay: el casillero sigue funcionando, `Shift` sigue haciendo rango.
- **BREAKING** de contrato menor: el requisito de hoy dice que el modo se activa al hacer clic
  en el casillero, como si fuera el único gesto.

**Etiquetas en lote**

- Aplicar etiquetas a todas las tareas seleccionadas, con el mismo selector que usa una tarea
  sola.

**Un menú de más en la barra**

- La barra ya tiene siete controles y le estamos sumando uno. Lo que se usa menos pasa detrás
  de un menú, como mostró el dueño.

Sin cambios de datos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `seleccion-multiple`: el modo se activa también con `Ctrl`+clic sobre la tarea, y la barra de
  acciones suma etiquetas en lote y agrupa lo menos usado en un menú.

## Impact

**Código.** La fila de tarea suma el manejo del modificador. Hoy no hay **ni una** lectura de
`Ctrl` o `Cmd` en todo el código de la aplicación: `Shift` es el único modificador que se lee.
La barra de acciones suma el selector de etiquetas y el menú.

**Mutación nueva.** Aplicar etiquetas en lote no existe. Las etiquetas de una tarea se guardan
por reemplazo del conjunto completo, así que **hay que decidir qué significa en lote**: sumar
las elegidas a lo que cada tarea ya tiene, o reemplazar el conjunto de todas.

**Riesgo.** `Ctrl`+clic es un gesto que el sistema operativo y el navegador ya usan —en algunas
plataformas equivale al clic derecho—. Y en este proyecto el clic derecho **acaba de** empezar
a abrir el menú de la tarea, así que los dos gestos conviven en el mismo elemento.

**Fuera de alcance.** Completar en lote, que no existe y no se pidió. Fechas arbitrarias en
lote: hoy hay tres atajos y siguen igual.
