## Why

Una tarea con subtareas plegadas hoy no dice nada de lo que esconde. "Preparar
la mudanza" se ve igual con dos subtareas hechas de tres que con cero de
doce, y hay que desplegarla para saberlo. Things y Todoist muestran `2/5` en
la fila misma: es el dato que decide si una tarea está por caer o ni empezó,
y en Trazio ya está calculado —la fila conoce sus hijas, por eso dibuja el
chevron— pero no se muestra.

## What Changes

- Una fila con subtareas SHALL mostrar cuántas están completadas sobre el
  total: `2/5`.
- Cuenta las subtareas **directas**, no el subárbol completo: son las que el
  chevron despliega, y contar nietas diría un número que no se corresponde
  con lo que aparece al abrir.
- Se muestra siempre que la tarea tenga subtareas, plegada o desplegada. Un
  número que aparece y desaparece según el pliegue es peor que uno estable.
- El contador NUNCA SHALL formar parte del nombre accesible del título: va
  como hermano del botón, igual que el chip de proyecto (D41). El conteo sí
  SHALL entrar en la etiqueta del chevron, que es el control que habla de las
  subtareas.
- El detalle de tarea, que ya lista las subtareas, SHALL mostrar el mismo
  contador en su encabezado.

## Capabilities

### Modified Capabilities

- `tareas`: la fila y el detalle muestran el progreso de las subtareas
  directas.

## Impact

**Componentes** — `components/tasks/task-row.tsx` ya calcula `children` y
`hasChildren` para decidir el chevron; el contador sale de ahí sin ninguna
consulta nueva. El detalle de tarea suma el mismo número.

**Datos** — ninguno. `completed_at` de cada hija es todo lo que hace falta.

**Fuera de alcance** — el modo panel: una tarjeta de panel se monta con
`isFlat`, que fuerza `children = []` a propósito, y traerle las hijas solo
para contar sería revertir esa decisión por un número. La barra de progreso
visual: es un número, no un gráfico.
