## Context

La administración de etiquetas está completa desde la fase 1: `lib/labels/mutations.ts`
tiene crear, actualizar —renombrar, recolorear y favorita— y eliminar;
`components/labels/labels-view.tsx` es la pantalla con la lista, "Nueva etiqueta" y las
acciones por fila; `label-form-dialog.tsx` y `delete-label-dialog.tsx` son los diálogos.
Todo cumple `administracion-de-etiquetas`.

Nada de eso se encuentra. El único enlace a `/etiquetas` en toda la aplicación vive en
`components/layout/account-menu.tsx`, dentro del menú cuyo disparador dice "Cuenta". El
comentario que hay ahí explica el porqué: en la fase 1 el spec prohibía el ítem en la
navegación principal porque `/etiquetas/<id>` no existía. La fase 2 creó esa página y
nadie volvió a mover el acceso.

El panel lateral sí tiene hoy una lista colapsable de etiquetas no favoritas
(`components/layout/label-filter-lists.tsx`), pero cada ítem enlaza a la página de esa
etiqueta, no a la administración, y el componente devuelve `null` cuando la lista queda
vacía. Con cero etiquetas, o con todas favoritas, la palabra "Etiquetas" no aparece en
ningún lado.

Esta propuesta es la continuación directa de `interfaz-descubrible`, que atacó
funcionalidad construida e invisible y se salteó justamente este caso.

Restricciones que condicionan: **D4** (solo español), **D24** (ninguna acción disponible
solo por un gesto), y la decisión **D-C** de `interfaz-descubrible` (el indicador de un
atajo se alimenta del binding real, nunca de una cadena escrita a mano).

## Goals / Non-Goals

**Goals:**

- Que llegar a administrar etiquetas no exija abrir un menú que dice "Cuenta".
- Que el acceso exista cuando el usuario tiene cero etiquetas, que es cuando lo necesita.
- Que renombrar la etiqueta que estoy mirando no me obligue a irme a otra pantalla.
- Un solo lugar del que cuelgue todo lo de etiquetas, no dos caminos parecidos.

**Non-Goals:**

- Tocar el CRUD. Está completo, funciona y cumple su spec.
- Rediseñar la pantalla de administración.
- Atajos nuevos más allá de `G E`.
- Cambiar cómo se comportan las favoritas en la sección Favoritos.

## Decisions

### D-A. El ítem principal va debajo de Próximos, y se muestra siempre

Orden del panel lateral: Bandeja, Hoy, Próximos, **Etiquetas**, Hábitos, Completado.

La posición la pidió el dueño explícitamente. Coincide con dónde tiene sentido: los tres
primeros son bandejas temporales, y Etiquetas es el primero de los cortes transversales.

**Se muestra siempre**, con cero etiquetas también. Hoy `label-filter-lists.tsx` devuelve
`null` cuando no hay ninguna no favorita, y eso además incumple el requisito vigente de
`navegacion-por-etiqueta`, que dice SHALL mostrar el acceso sin condicionarlo a que haya
contenido. Un usuario nuevo tiene cero etiquetas por definición: esconderle la puerta es
exactamente el peor momento para hacerlo.

### D-B. El ítem lleva a la administración; la lista sigue llevando a cada etiqueta

Dos destinos distintos que no hay que confundir:

| Dónde se hace clic | A dónde va |
| --- | --- |
| "Etiquetas" | `/etiquetas`, la pantalla de administración |
| Una etiqueta de la lista desplegable | `/etiquetas/<id>`, sus tareas |

Es el mismo reparto que ya existe con proyectos, y conserva el requisito vigente de
`navegacion-por-etiqueta` sobre la lista colapsable de no favoritas, que no hay motivo
para romper: sigue siendo la forma rápida de saltar a una etiqueta puntual.

Lo que sí se resuelve es que hoy esa lista es el **único** rastro de las etiquetas en el
panel lateral y no lleva a administrarlas. Ahora cuelga del ítem que sí lo hace.

*Alternativa descartada:* que el ítem principal solo despliegue la lista, sin destino
propio. Deja la administración sin puerta, que es el problema que vinimos a resolver.

### D-C. `G E` para Etiquetas

| Acorde | Destino |
| --- | --- |
| `G I` | Bandeja |
| `G H` | Hoy |
| `G P` | Próximos |
| **`G E`** | **Etiquetas** |
| `G A` | Hábitos |
| `G C` | Completado |

La `E` está libre dentro del mapa del acorde. La `E` suelta —que abre el alta de un
evento de calendario— **no colisiona**: mientras el acorde está pendiente ninguna tecla
suelta dispara su propio atajo, que es el comportamiento ya especificado y probado.

Hay que verificar que la letra no esté tomada por ningún binding por pantalla ni del
detalle de tarea antes de escribir nada, igual que se hizo con `H` y `P`.

El indicador se alimenta del binding real, por **D-C** de `interfaz-descubrible`: el mapa
inverso `CHORD_KEY_BY_DESTINATION` ya se deriva de `CHORD_MAP`, así que sumar la entrada
alcanza y el indicador sale solo. Si hiciera falta escribir la tecla a mano, va con un
test que verifique que coincide con el binding.

### D-D. La página de una etiqueta gana su menú de acciones

`components/labels/label-view.tsx` muestra hoy el título y el conteo de tareas, y nada
más. Quien está mirando `Casa` y la quiere renombrar tiene que irse a `/etiquetas`,
buscarla en la lista y editarla ahí.

Gana renombrar, recolorear, marcar favorita y eliminar, **reutilizando
`label-form-dialog.tsx` y `delete-label-dialog.tsx`**, que ya existen y ya cumplen el
requisito de confirmación antes de borrar. No se escriben diálogos nuevos.

El patrón a copiar es `components/projects/project-header.tsx`, que ya tiene exactamente
esto: la estrella de favorito y un menú de acciones. Que se sienta igual, porque es lo
mismo.

Al eliminar la etiqueta que se está mirando hay que navegar a otro lado —la pantalla
quedaría apuntando a algo que ya no existe—. Va a `/etiquetas`.

### D-E. "Etiquetas" sale del menú de Cuenta

Se saca la entrada de `account-menu.tsx`. Dejarla sería tener dos caminos a lo mismo, uno
de ellos en un menú que no habla de etiquetas.

Esto **no** contradice **D24**: la acción no queda disponible solo por un gesto, queda
disponible por un ítem de la navegación principal y por un atajo. Es un camino que se
mueve, no uno que se elimina.

Queda anotado que "Filtros" sigue en ese menú con el mismo problema. No se toca acá: es
otra capacidad, con su propio spec, y merece su propia decisión en vez de arrastrarse de
prepo en una propuesta sobre etiquetas.

## Risks / Trade-offs

**El panel lateral suma un ítem** → Pasa de cinco accesos principales a seis. Es el costo
de que la sección exista; el dueño lo pidió sabiendo dónde lo quería.

**Dos destinos parecidos en el mismo bloque** → El ítem lleva a administrar y la lista de
abajo a cada etiqueta. Si al usarlo resulta confuso, la salida es que la lista desplegable
cierre con un "Administrar etiquetas", pero no lo agrego ahora: sería un tercer camino a
la misma pantalla antes de saber si hace falta.

**Sumar una tecla al acorde achica el espacio libre** → Quedan `I H P E A C` tomadas.
Ninguna sección futura debería tomar una letra sin revisar el mapa completo.

**El gate en verde no prueba nada** → Es enteramente de navegación e interfaz. Se verifica
apretando `G E`, entrando con cero etiquetas, y renombrando una etiqueta desde su propia
página. Ninguna de las tres la ve un test unitario.

## Open Questions

- Si la lista colapsable de no favoritas conviene que quede colgando del ítem nuevo o
  como hermana. Es una diferencia de anidamiento visual que se resuelve mejor mirándola
  que discutiéndola; que la implementación elija y se revise en el navegador.
- "Filtros" tiene el mismo problema que tenía "Etiquetas" y queda en el menú de Cuenta.
  Vale una propuesta propia, no un arrastre de esta.
