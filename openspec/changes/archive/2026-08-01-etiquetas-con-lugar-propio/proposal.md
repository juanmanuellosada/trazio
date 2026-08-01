## Why

Las etiquetas de Trazio tienen su administración completa desde la fase 1 —crear,
renombrar, recolorear, eliminar, favoritas, todo construido y funcionando en
`/etiquetas`— y **el único camino para llegar es el menú "Cuenta"**, detrás de un
ícono de tres puntitos al pie del panel lateral, entre "Configuración", "Filtros" y
"Cerrar sesión".

Se metió ahí en la fase 1 porque el spec de entonces **prohibía explícitamente** un
ítem "Etiquetas" en la navegación principal: la página por etiqueta todavía no
existía. Esa razón caducó en la fase 2, cuando se creó `/etiquetas/<id>`, y el
ítem nunca se movió.

Encima el panel lateral **esconde el acceso por completo cuando el usuario no tiene
ninguna etiqueta**, que es justo el momento en que querría crear la primera. Eso
además incumple un requisito vigente de `navegacion-por-etiqueta`, que dice que el
acceso SHALL mostrarse, sin condicionarlo a que haya contenido.

El dueño lo dijo así: *"No encuentro dónde se administran, veo un desplegable que
las muestra. Pero debería estar abajo de Próximos con su propio atajo, sección y
lugar para crearlas."*

Es el mismo problema que atacó `interfaz-descubrible` —funcionalidad construida que
resulta invisible— en la parte que esa propuesta no miró.

## What Changes

**Etiquetas pasa a ser una sección de primera clase en el panel lateral**

- Un acceso "Etiquetas" en la navegación principal, **debajo de Próximos**, junto a
  Bandeja, Hoy, Próximos, Completado y Hábitos.
- **Se muestra siempre**, tenga el usuario etiquetas o no. Hoy desaparece cuando no
  hay ninguna, que es cuando más falta hace.
- Lleva a `/etiquetas`, la pantalla de administración que ya existe.

**El acorde de navegación suma `G E`**

- `G E` navega a Etiquetas. La `E` está libre dentro del acorde; la `E` suelta
  —que abre el alta de evento— no colisiona, porque el acorde captura la segunda
  tecla.
- Se suma a `G I`, `G H`, `G P`, `G C` y `G A`, y lleva su indicador visual como
  los demás.

**Desde la pantalla de etiquetas se crea, en lugar visible**

- La pantalla ya tiene "Nueva etiqueta". Lo que cambia es que ahora se llega.

**La página de una etiqueta gana su menú de acciones**

- Hoy `/etiquetas/<id>` muestra el título y el conteo de tareas, y nada más: quien
  está mirando su etiqueta `Casa` y la quiere renombrar no tiene desde dónde.
- Gana renombrar, recolorear, marcar favorita y eliminar, reutilizando los diálogos
  que ya usa la pantalla de administración. Es lo mismo que ya hace el encabezado de
  un proyecto.

**"Etiquetas" sale del menú de Cuenta**

- Deja de estar duplicado en un menú que dice "Cuenta" y no habla de etiquetas.

Ninguno de estos cambios es **BREAKING**: no se toca el esquema, ni las mutaciones,
ni el CRUD. Todo lo que se agrega es camino.

## Capabilities

### New Capabilities

Ninguna. Todo lo que hace falta ya está construido; lo que cambia es dónde se
encuentra.

### Modified Capabilities

- `navegacion-por-etiqueta`: el acceso "Etiquetas" pasa de la lista colapsable de
  no favoritas a un ítem de la navegación principal, debajo de Próximos, visible
  siempre. Se corrige el requisito que hoy el código incumple al esconderlo cuando
  no hay etiquetas.
- `atajos-de-teclado`: el acorde `G` suma la tecla `E` para Etiquetas.
- `administracion-de-etiquetas`: la pantalla de administración pasa a ser
  alcanzable desde la navegación principal, y las acciones sobre una etiqueta pasan
  a estar disponibles también desde su propia página.

## Impact

**Código.** `components/layout/sidebar-content.tsx` suma el ítem con su indicador de
atajo. `components/layout/label-filter-lists.tsx` pierde el `return null` que esconde
el acceso, y hay que decidir qué pasa con la lista colapsable de no favoritas ahora
que existe el ítem principal. `components/layout/account-menu.tsx` pierde su entrada.
`lib/shortcuts/chord.ts` suma la tecla. `components/labels/label-view.tsx` gana el
menú de acciones, reutilizando `label-form-dialog.tsx` y `delete-label-dialog.tsx`.

**Documentación.** La sección 10 de `docs/product-spec.md` lista el acorde y hay que
sumarle `G E`. La descripción del panel lateral también lo enumera.

**Dependencias.** Ninguna nueva.

**Orden.** Esta propuesta asume que `interfaz-descubrible` ya está archivada: sus
deltas dejan el acorde en `G H` y `G P`, y agregan la capacidad de indicadores de
atajo de la que este cambio se cuelga.

**Fuera de alcance.** No se toca el CRUD, que está completo y cumple su spec. No se
rediseña la pantalla de administración. No se agregan atajos más allá de `G E`. No
se cambia el comportamiento de las etiquetas favoritas en la sección Favoritos.
