## Why

Los filtros están construidos enteros —lenguaje de consulta con diez campos,
errores en español con posición, vista previa de coincidencias, favoritos,
página propia— y son prácticamente inalcanzables.

Dos líneas lo explican. `components/layout/label-filter-lists.tsx:58` hace
`if (filters.length === 0) return null`: la lista desaparece del panel lateral
cuando no tenés ninguno. Y el único enlace a `/filtros` en toda la aplicación
está en `components/layout/account-menu.tsx:71`, dentro del menú de la cuenta,
donde uno busca "cerrar sesión".

El resultado es un círculo cerrado: sin filtros no ves la lista, y sin la lista
no sabés que podés crear uno.

La evidencia de que el problema es real es fuerte: **el dueño del proyecto, que
especificó los filtros, preguntó por ellos como si Trazio no los tuviera**,
después de verlos anunciados en otra aplicación.

Etiquetas, que es una función comparable, tiene entrada propia en la
navegación y atajo `G · E`. Filtros no tiene ninguna de las dos — y el spec
tampoco se las da, así que el hueco viene del diseño, no de la
implementación.

## What Changes

- Filtros SHALL tener entrada propia en la navegación principal del panel
  lateral, al lado de Etiquetas, con su atajo del acorde `G`.
- La lista de filtros del panel lateral NUNCA SHALL desaparecer por estar
  vacía: SHALL mostrar un estado vacío que invite a crear el primero.
- El enlace enterrado en el menú de la cuenta SHALL quitarse: deja de hacer
  falta y ahí no lo busca nadie.
- Donde se escribe una consulta SHALL haber una **referencia del lenguaje**:
  todos los campos con sus valores, los operadores, y **ejemplos concretos que
  se insertan al tocarlos**. Hoy no existe ninguna ayuda — cero referencias en
  toda la carpeta de filtros—, y el lenguaje tiene diez campos que nadie puede
  adivinar.

No hace falta construir el CRUD ni los errores de sintaxis: los diez
requisitos de `filtros-guardados` ya cubren crear, editar la consulta,
renombrar, color, ícono, favorito, eliminar, página de resultados y vista
previa del conteo; y "errores de sintaxis en español que señalan la posición"
es un requisito existente de `lenguaje-de-consulta`, ya implementado.

## Capabilities

### Modified Capabilities

- `filtros-guardados`: la pantalla pasa a ser alcanzable desde la navegación
  principal, y la lista deja de esconderse vacía.
- `atajos-de-teclado`: el acorde `G` suma su destino.

## Impact

**Interfaz** — `components/layout/label-filter-lists.tsx` (el `return null`),
`components/layout/sidebar-content.tsx` o quien arme la navegación principal,
y `components/layout/account-menu.tsx` (quitar el enlace).

Salió al implementar, no previsto acá: `lib/search/nav-destinations.ts`, la
lista del grupo "Ir a" del buscador (`Ctrl/Cmd+K`). Es la misma
`ChordDestination` que arma el acorde `G` y su propio comentario decía
"mismo orden y destinos que el panel lateral" — dejar a Filtros afuera
mantenía cerrada una de las dos puertas que este cambio existe para abrir, y
volvía falso ese comentario.

**Atajos** — una tecla más en el acorde `G`, que hoy tiene `I`, `H`, `P`, `E`,
`C` y `A`. Hay que elegir una libre y verificar que no colisione.

**Datos** — ninguno.

**Fuera de alcance** — cambiar el lenguaje de consulta, y el contenido de
ejemplo del onboarding, que ya suma un filtro guardado en su propio cambio.
