## Context

`alta-de-tareas-en-contexto`, del mismo día, resolvió una contradicción real entre dos
requisitos: uno prohibía el selector de destino en la variante embebida por considerarlo
ruido, y otro exigía que el destino se viera antes de confirmar. Se resolvió a favor de
mostrarlo siempre.

Lo que esa decisión no consideró es que **el alta de subtarea usa esa misma variante**. Al
hacerlo visible sin condición, apareció donde no corresponde.

## Goals / Non-Goals

**Goals:**

- Que el alta no ofrezca elegir algo que no se puede elegir.
- Que el spec deje de contradecir al código.

**Non-Goals:**

- Revisar el resto de la regla del destino, que está bien.
- Mostrar de otra forma a qué proyecto va la subtarea.

## Decisions

### D-A. La excepción es por tener padre, no por variante

Se podría escribir como "en el alta de subtarea no se muestra". Se escribe como **"cuando
el alta tiene una tarea padre, no se muestra"**.

La diferencia importa: la variante embebida se usa en listas, secciones y subtareas, y en
las dos primeras el destino **sí** tiene que verse. Atar la excepción a la variante
volvería a romper lo que la propuesta anterior arregló.

### D-B. No se reemplaza por un indicador de solo lectura

Sacar el selector deja al usuario sin ver a qué proyecto va a caer la subtarea. Se podría
poner un texto no editable.

No se hace, por ahora. La subtarea se crea **desde** su tarea padre —desde el menú de su
fila o desde el detalle abierto—, así que el contexto está a la vista: el usuario acaba de
mirar la tarea a la que se la está colgando. Agregar un indicador es sumar ruido para
repetir algo que la pantalla ya dice.

Si al usarlo se extraña, se agrega. Es más fácil sumar eso después que sacar un control que
nunca hizo falta.

## Risks / Trade-offs

**Volver a tocar una regla que se acaba de escribir** → Es el segundo cambio del día sobre
el mismo requisito. No es indecisión: la propuesta anterior resolvió bien el conflicto que
tenía enfrente y se le escapó un caso. Escribir la excepción por "tener padre" y no por
variante es lo que evita la tercera vuelta.

**Un usuario podría no saber dónde cae la subtarea** → Asumido en D-B, con la salida
anotada.
