## 1. Acceso principal

- [x] 1.1 Sumar Filtros a los accesos principales del panel lateral, junto a Etiquetas, Hábitos y Completado.
- [x] 1.2 Elegir la tecla del acorde `G` verificando contra el spec de atajos cuáles están tomadas (`I`, `H`, `P`, `E`, `C`, `A`). No suponer que una está libre.
- [x] 1.3 Sumar el indicador de atajo, con el mismo tratamiento que los demás accesos.
- [x] 1.4 Quitar el enlace a `/filtros` de `components/layout/account-menu.tsx`.
- [x] 1.5 Sumar Filtros a `lib/search/nav-destinations.ts` (grupo "Ir a" del buscador), en la misma posición relativa que en el panel lateral, entre Etiquetas y Hábitos. Salió al implementar, no estaba en el Impact original de `proposal.md`: es la segunda puerta a la pantalla de filtros, y su propio comentario ("mismo orden y destinos que el panel lateral") quedaba falso si no se sumaba acá también.

## 2. Estado vacío

- [x] 2.1 En `components/layout/label-filter-lists.tsx`, sacar el `return null` de la rama de filtros y mostrar el estado vacío con acceso a crear el primero.
- [x] 2.2 Texto que invita, sin explicar el lenguaje de consulta (D-B). Seguir `.claude/rules/copy.md`.
- [x] 2.3 Decidir explícitamente si la lista de **etiquetas** mantiene su `return null` o recibe el mismo trato. Etiquetas ya tiene acceso principal, así que no sufre el mismo problema — pero que quede escrito por qué se las trata distinto.

## 3. Tests

- [x] 3.1 Test de que la lista de filtros se ve con cero filtros.
- [x] 3.2 Test del acceso principal y del acorde.
- [x] 3.3 Test de que el menú de la cuenta ya no ofrece filtros.

## 4. Cierre

- [x] 4.1 Actualizar `docs/product-spec.md`: el panel lateral y la sección de atajos.
- [x] 4.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 4.3 Verificar en el navegador con una cuenta sin filtros: tiene que poder llegar y crear el primero sin saber la ruta.

## 5. Referencia del lenguaje

- [x] 5.1 Extraer a una única fuente la lista de campos del lenguaje, hoy escrita a mano en el mensaje de error de `lib/query-language/parse.ts` (D-E). Los dos lugares tienen que derivar de ahí.
- [x] 5.2 Referencia en el alta y edición de filtro: campos con sus valores, operadores de combinación y agrupación.
- [x] 5.3 Ejemplos concretos que se insertan en el campo al tocarlos (D-D), para que la vista previa del conteo —que ya existe— muestre el resultado sobre los datos propios.
- [x] 5.4 Que la referencia no tape el campo ni la vista previa: se aprende viendo el resultado, así que los dos tienen que convivir en pantalla.
- [x] 5.5 Copy según `.claude/rules/copy.md`. Nada de párrafos explicativos: la referencia se toca, no se lee.
- [x] 5.6 Test de que agregar un campo al lenguaje lo hace aparecer en la referencia sin tocarla.
