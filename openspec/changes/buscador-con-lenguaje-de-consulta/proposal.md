## Why

Trazio tiene un parser de lenguaje de consulta completo —`lib/query-language/`,
con tokenizador, errores en español que señalan la posición, y validación de
valores— y una función SQL, `buscar_tareas(ast)`, que evalúa una consulta ya
parseada. Todo eso lo usan **solo los filtros guardados**.

El buscador, mientras tanto, hace `textSearch` sobre `search_vector` y nada
más. Escribir `p1 due:overdue` ahí no busca tareas urgentes vencidas: busca
tareas que contengan literalmente ese texto, y no encuentra ninguna.

Las dos mitades ya existen. No se hablan.

## What Changes

- El buscador SHALL reconocer cuando lo escrito es una consulta del lenguaje
  de filtros y, en ese caso, resolverla con el parser y la función SQL que ya
  existen, en vez de buscarla como texto.
- Cuando lo escrito **no** es una consulta, SHALL seguir siendo búsqueda de
  texto exactamente como hoy: mismo mínimo de dos caracteres, mismo tope de
  50 resultados, mismo orden, misma insensibilidad a acentos.
- Un error de sintaxis SHALL mostrarse en español señalando la posición, igual
  que al editar un filtro — reusando los mismos mensajes.
- El buscador SHALL ofrecer guardar la consulta escrita como filtro, que es el
  paso natural siguiente y hoy obliga a reescribirla en otra pantalla.

## Capabilities

### Modified Capabilities

- `buscador`: suma el modo consulta junto al de texto, con su manejo de
  errores.

## Impact

**Cliente** — `lib/search/use-search.ts` (hoy `textSearch`) suma la rama de
consulta, reusando `lib/query-language/parse.ts` y el RPC `buscar_tareas`
tal como los llama `lib/filters/use-filter-results.ts`. Es cableado, no
construcción.

**Interfaz** — `components/search/search-command.tsx` y `search-palette.tsx`
para el error de sintaxis y la acción de guardar como filtro.

**Datos** — ninguno. La función SQL y el parser ya están en producción.

**Fuera de alcance** — mezclar los dos modos en una sola consulta (texto libre
combinado con campos), corrección de errores de tipeo (decisión tomada: la
búsqueda es literal), y cambiar el lenguaje de consulta.
