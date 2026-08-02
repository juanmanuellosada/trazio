## Why

El alta de una **subtarea** muestra hoy un selector de destino, y no debería: una subtarea
hereda el proyecto de su tarea padre. No puede estar en un proyecto distinto, así que
ofrecer elegir uno es ofrecer algo que no se puede hacer.

Es una regresión que introduje yo el mismo día, en `alta-de-tareas-en-contexto`. Esa
propuesta hizo el destino visible en las dos superficies del alta —con buen motivo: el
requisito de "el destino se ve antes de confirmar" chocaba con otro que lo prohibía en la
variante embebida— pero **no lo condicionó a que la tarea no fuera subtarea**. El alta de
subtarea usa esa misma variante, así que se lo llevó puesto.

El código ya está corregido. Esta propuesta existe porque **el spec quedó contradiciendo
al código**: dice que el destino se muestra en las dos superficies, sin excepción.

## What Changes

**El alta de una subtarea no muestra selector de destino**

- Cuando el alta se abre con una tarea padre, el destino no se ofrece: lo determina el
  padre.
- En todo el resto de los casos el destino se sigue mostrando, como está hoy.

Sin cambios de datos, ni de comportamiento fuera de esa superficie.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `alta-de-tareas`: la regla de que el destino se muestra en las dos superficies gana su
  excepción para las subtareas.

## Impact

**Código.** Ya está hecho, en `components/tasks/task-quick-add-row.tsx`.

**Spec.** Es lo único que falta y es el motivo de la propuesta.

**Fuera de alcance.** El resto de la regla del destino, que sigue igual. Y **mostrar de
alguna forma a qué proyecto va a caer la subtarea**: se podría argumentar que conviene
verlo aunque no se pueda cambiar, pero eso es agregar algo, no sacar lo que sobra, y
merece pedirse aparte si al usarlo se extraña.
