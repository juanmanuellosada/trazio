## 1. Acceso principal

- [ ] 1.1 Sumar Filtros a los accesos principales del panel lateral, junto a Etiquetas, Hábitos y Completado.
- [ ] 1.2 Elegir la tecla del acorde `G` verificando contra el spec de atajos cuáles están tomadas (`I`, `H`, `P`, `E`, `C`, `A`). No suponer que una está libre.
- [ ] 1.3 Sumar el indicador de atajo, con el mismo tratamiento que los demás accesos.
- [ ] 1.4 Quitar el enlace a `/filtros` de `components/layout/account-menu.tsx`.

## 2. Estado vacío

- [ ] 2.1 En `components/layout/label-filter-lists.tsx`, sacar el `return null` de la rama de filtros y mostrar el estado vacío con acceso a crear el primero.
- [ ] 2.2 Texto que invita, sin explicar el lenguaje de consulta (D-B). Seguir `.claude/rules/copy.md`.
- [ ] 2.3 Decidir explícitamente si la lista de **etiquetas** mantiene su `return null` o recibe el mismo trato. Etiquetas ya tiene acceso principal, así que no sufre el mismo problema — pero que quede escrito por qué se las trata distinto.

## 3. Tests

- [ ] 3.1 Test de que la lista de filtros se ve con cero filtros.
- [ ] 3.2 Test del acceso principal y del acorde.
- [ ] 3.3 Test de que el menú de la cuenta ya no ofrece filtros.

## 4. Cierre

- [ ] 4.1 Actualizar `docs/product-spec.md`: el panel lateral y la sección de atajos.
- [ ] 4.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 4.3 Verificar en el navegador con una cuenta sin filtros: tiene que poder llegar y crear el primero sin saber la ruta.

## 5. Referencia del lenguaje

- [ ] 5.1 Extraer a una única fuente la lista de campos del lenguaje, hoy escrita a mano en el mensaje de error de `lib/query-language/parse.ts` (D-E). Los dos lugares tienen que derivar de ahí.
- [ ] 5.2 Referencia en el alta y edición de filtro: campos con sus valores, operadores de combinación y agrupación.
- [ ] 5.3 Ejemplos concretos que se insertan en el campo al tocarlos (D-D), para que la vista previa del conteo —que ya existe— muestre el resultado sobre los datos propios.
- [ ] 5.4 Que la referencia no tape el campo ni la vista previa: se aprende viendo el resultado, así que los dos tienen que convivir en pantalla.
- [ ] 5.5 Copy según `.claude/rules/copy.md`. Nada de párrafos explicativos: la referencia se toca, no se lee.
- [ ] 5.6 Test de que agregar un campo al lenguaje lo hace aparecer en la referencia sin tocarla.
