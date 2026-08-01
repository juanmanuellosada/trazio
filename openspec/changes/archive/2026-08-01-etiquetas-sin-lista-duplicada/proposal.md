## Why

`etiquetas-con-lugar-propio` le dio a las etiquetas un acceso propio en la navegación
principal, y dejó donde estaba la lista plegable de etiquetas no favoritas que ya
existía más abajo, junto a Favoritos, Proyectos y Filtros.

Su `design.md` anotó el riesgo por escrito: *"Dos destinos parecidos en el mismo
bloque. Si al usarlo resulta confuso, la salida es que la lista desplegable cierre con
un 'Administrar etiquetas'"*. Se eligió dejarlas separadas porque pegadas quedaban dos
filas seguidas diciendo "Etiquetas".

Al usarlo, el dueño lo resolvió distinto: *"en la barra sacá el desplegable de
etiquetas, ahora todo se gestiona desde su sección"*. La lista sobra.

Y tiene sentido: la lista plegable existía porque era **el único** rastro de las
etiquetas en el panel lateral, en una época en la que la administración estaba
enterrada en el menú de cuenta. Ese motivo desapareció hace unas horas.

## What Changes

**El panel lateral deja de mostrar la lista plegable de etiquetas no favoritas**

- Se saca. El acceso "Etiquetas" de la navegación principal, que lleva a la pantalla
  de administración, se queda tal cual.
- Las etiquetas favoritas **siguen** apareciendo en la sección Favoritos, con su enlace
  a la página de cada una. No se toca.
- Se pierde el salto directo a una etiqueta no favorita desde el panel lateral: pasa a
  ser dos clics, por la pantalla de etiquetas. Es el costo aceptado, y para las
  etiquetas de uso frecuente está Favoritos.

**La lista plegable de Filtros no se toca**

- Tiene exactamente la misma forma y el mismo problema, pero es otra capacidad y su
  administración sigue enterrada en el menú de cuenta, así que sacarle la lista la
  dejaría sin ningún acceso. Necesita su propia propuesta, que le dé primero un lugar
  propio como se hizo con etiquetas.

Ninguno de estos cambios es **BREAKING** en datos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `navegacion-por-etiqueta`: el acceso "Etiquetas" del panel lateral deja de tener
  colgando la lista plegable de etiquetas no favoritas.

## Impact

**Código.** `components/layout/label-filter-lists.tsx` pierde `LabelsCollapsibleList`
—y conviene revisar qué queda compartido con `FiltersCollapsibleList`, que se
mantiene—. `components/layout/sidebar-content.tsx` deja de montarla. Los tests que la
cubren, incluidos los de cero etiquetas y todas favoritas que se escribieron hace unas
horas, se ajustan al acceso principal, que es el que ahora garantiza esos casos.

**Documentación.** La descripción del panel lateral en `docs/product-spec.md` enumera
la lista plegable.

**Dependencias.** Ninguna nueva.

**Fuera de alcance.** No se toca Favoritos, ni la lista plegable de Filtros, ni la
pantalla de administración, ni el acceso principal recién agregado.
