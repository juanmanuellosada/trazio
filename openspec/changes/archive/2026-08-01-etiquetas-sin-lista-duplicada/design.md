## Context

Hace unas horas `etiquetas-con-lugar-propio` agregó el acceso "Etiquetas" a la
navegación principal del panel lateral, entre Próximos y Hábitos, con destino a la
pantalla de administración.

La lista plegable de etiquetas no favoritas —`LabelsCollapsibleList`, en
`components/layout/label-filter-lists.tsx`— quedó donde estaba: más abajo, en el bloque
desplazable junto a Favoritos, Proyectos y Filtros. La decisión de dejarla ahí en vez
de colgarla del acceso nuevo fue deliberada y está anotada: pegadas, quedaban dos filas
seguidas diciendo "Etiquetas".

Lo que no se consideró es sacarla. Ahora que existe el acceso principal, esta propuesta
lo hace.

Restricciones que condicionan: **D24** (ninguna acción disponible solo por un gesto) y
la decisión **D-B** de `etiquetas-con-lugar-propio`, que separó los dos destinos —el
acceso lleva a administrar, la lista llevaba a cada etiqueta—.

## Goals / Non-Goals

**Goals:**

- Un solo lugar en el panel lateral del que cuelguen las etiquetas.
- Que no queden dos filas parecidas que hagan cosas distintas.

**Non-Goals:**

- Tocar Favoritos, que sigue mostrando las etiquetas favoritas con enlace a su página.
- Tocar la lista plegable de Filtros.
- Tocar la pantalla de administración ni el acceso principal.

## Decisions

### D-A. Se saca la lista, no se la mueve ni se la reetiqueta

Las alternativas que había sobre la mesa eran tres: colgarla del acceso nuevo,
dejarla donde está con un "Administrar etiquetas" al pie, o sacarla.

Se saca. Las dos primeras conservan dos superficies para lo mismo en un panel que ya
tiene seis accesos principales más Favoritos, Proyectos y Filtros. La lista existía
porque era el **único** rastro de las etiquetas cuando la administración estaba
enterrada en el menú de cuenta; ese motivo ya no está.

### D-B. Lo que se pierde, y por qué se acepta

Saltar a una etiqueta no favorita pasa de un clic —expandir y elegir— a dos: entrar a
Etiquetas y elegir de la lista.

Se acepta por dos razones. Las etiquetas de uso frecuente son justamente las que uno
marca como favoritas, y esas siguen a un clic desde Favoritos. Y la pantalla de
etiquetas es un mejor lugar para elegir entre muchas que una lista plegable dentro de
una barra angosta.

**No contradice D24**: la acción no queda disponible solo por un gesto, queda disponible
por la pantalla de etiquetas, por Favoritos si está marcada, y por el buscador. Es un
camino que se acorta a favor de otro, no uno que desaparece.

### D-C. Filtros se queda, y no es incoherencia

`FiltersCollapsibleList` tiene la misma forma y el mismo problema. No se toca acá, y no
por prolijidad de alcance: **la administración de filtros sigue enterrada en el menú de
cuenta**. Sacarle la lista plegable ahora lo dejaría sin ningún acceso visible, que es
exactamente el agujero que veníamos de tapar con etiquetas.

El orden correcto para filtros es el mismo que se siguió acá: primero darle un lugar
propio en la navegación, después evaluar si la lista plegable sobra. Eso es una
propuesta aparte.

## Risks / Trade-offs

**Un usuario con muchas etiquetas y pocas favoritas pierde agilidad** → Es el caso
donde más se siente el clic extra. La salida, si aparece, es marcar favoritas las de
uso frecuente, que es para lo que están.

**Los dos componentes comparten código** → `LabelsCollapsibleList` y
`FiltersCollapsibleList` viven en el mismo archivo. Sacar una sin romper la otra exige
mirar qué era compartido y qué era propio, no borrar el archivo.

**Los tests de cero etiquetas y de todas favoritas se escribieron para la lista** → Se
escribieron hace unas horas, para garantizar que el acceso no desapareciera. Esos casos
siguen importando, pero ahora los garantiza el acceso principal: hay que reapuntarlos,
no borrarlos.
