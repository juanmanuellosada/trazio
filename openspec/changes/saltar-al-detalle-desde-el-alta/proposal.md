## Why

El dueño lo pidió así: *"tanto este modal, como el modal de añadir tarea que se embebe en la
página tienen que tener la posibilidad de abrir la tarea en el otro modal grande que sale de
detalle de tarea."*

El alta es deliberadamente acotada: título, descripción y unos pocos atributos. Está bien
para lo que es. Pero cuando escribiendo una tarea te das cuenta de que necesita subtareas, o
un comentario, o una descripción con formato, **el alta no alcanza y no hay salida**: hay que
confirmar, buscar la tarea en la lista y abrirla.

## What Changes

**El alta ofrece continuar en el detalle**

- En las dos superficies: el modal y la embebida.
- **Crea la tarea con lo que haya escrito y abre su detalle.** No es "abrir un editor más
  grande antes de crear".

Esto último no es un detalle de implementación: el detalle muestra **comentarios y
subtareas**, y las dos cosas cuelgan de una tarea que existe. Un editor grande previo a la
creación no podría mostrarlas, así que sería otra pantalla distinta con el mismo nombre.

**Lo que se conserva al saltar**

- Todo lo que se haya cargado: título con lo que el lenguaje natural haya interpretado,
  descripción, fecha, prioridad, etiquetas, recordatorios y destino.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `alta-de-tareas`: el componente de alta suma una tercera acción, además de confirmar y
  cancelar: crear la tarea y continuar en su detalle.

## Impact

**Código.** `components/tasks/task-quick-add-row.tsx` suma la acción. La apertura del detalle
ya existe y **ya deja su entrada en el historial**, así que volver atrás desde ahí cierra el
detalle y no saca al usuario de la aplicación.

**Riesgo.** Es una tercera acción en un formulario que tiene dos, y en la variante embebida el
espacio es escaso. Que no compita visualmente con confirmar: **la acción principal sigue
siendo agregar la tarea**.

**Ojo con el alta que abre plegada.** El modal global abre con título y destino, y el resto
detrás del control de desplegar. La acción nueva tiene que estar visible sin desplegar — es
justo cuando uno se da cuenta de que la tarea necesita más de lo que el alta ofrece.

**Fuera de alcance.** Cambiar qué campos tiene el alta. Abrir el detalle sin crear la tarea,
que como se explicó no es posible sin inventar otra pantalla.
