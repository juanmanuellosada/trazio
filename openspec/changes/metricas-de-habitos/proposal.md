## Why

La sección de hábitos hoy mide una sola cosa: la racha. Y la racha castiga con
dureza algo que le pasa a cualquiera — faltar un día, aunque sea por estar
enfermo — porque un hábito diario que se corta vuelve a arrancar de cero. Eso
no es un defecto del cálculo (D10 ya lo resuelve bien: se calcula al leer, no
se guarda), es un defecto de qué se elige mostrar como métrica principal.

El pedido original del dueño fue agregar contenido explicativo sobre "los 21
días para formar un hábito". Esa cifra viene de *Psycho-Cybernetics* (1960) de
Maxwell Maltz — una observación clínica sobre cuánto tardaban sus pacientes de
cirugía plástica en acostumbrarse a su cara nueva, no investigación sobre
hábitos — y agregar un párrafo motivacional además violaría
`.claude/rules/copy.md` ("la app organiza, no arenga"). La alternativa
acordada: usar evidencia real para cambiar qué mide la pantalla, no para
agregar texto.

**Lally, van Jaarsveld, Potts & Wardle (2010)**, *European Journal of Social
Psychology*, siguió 96 personas formando un hábito diario en su vida real:
mediana de 66 días hasta la automaticidad, con un rango de 18 a 254 —
enorme. Dos hallazgos son la base de este cambio: **fallar un día no afecta
materialmente el proceso**, y la curva de progreso es **asintótica** — las
primeras repeticiones valen mucho más que las últimas.

De ahí sale la mecánica nueva: junto a la racha, mostrar **constancia**
("28 de los últimos 30 días") — que no se rompe por un mal día — y un
**contador de repeticiones** ("llevás 34 repeticiones") — que nunca vuelve a
cero. Las dos leen mejor la realidad de lo que Lally et al. describen que una
racha sola.

## What Changes

- La tarjeta de un hábito SHALL sumar **constancia**: la proporción de días
  cumplidos sobre los días que le tocaban en una ventana de 30 días (o menos,
  si el hábito es más joven), junto a la racha actual y la mejor racha.
- Un día salteado (`habit_skips`) SHALL salir del denominador de la
  constancia — ni cuenta como cumplido ni como fallado, no participa del
  cálculo. Es la misma filosofía que ya rige la racha (D50: saltear no la
  toca), llevada a la métrica nueva.
- La tarjeta SHALL sumar un **contador de repeticiones**: el total histórico
  de `habit_completions` del hábito, sin ventana ni tope — a diferencia de la
  racha y de la constancia, nunca baja.
- La pantalla `/habitos` SHALL mostrar, una sola vez al pie de la pantalla,
  una línea con la referencia a Lally et al. (2010): la mediana de 66 días
  para automatizar un hábito, con su rango real.
- Ninguna de las dos métricas nuevas SHALL guardarse en una columna
  denormalizada: se calculan al leer, mismo criterio que ya exige D10 para la
  racha.
- La pantalla NUNCA SHALL sumar gráficos, puntajes, insignias, niveles ni
  ninguna forma de comparación con otras personas.

## Capabilities

### Modified Capabilities

- `pantalla-habitos`: la tarjeta de un hábito suma constancia y repeticiones;
  la pantalla suma la línea de referencia al pie.

## Impact

**Frontend y una consulta nueva, sin migración.** No hay columna nueva ni
tabla nueva: constancia y repeticiones se calculan a partir de
`habit_completions` y `habit_skips`, que ya existen. La ventana que hoy trae
`getHabitCompletionsHistory`/`fetchHabitCompletionsHistory` (14 días, para el
mini-mapa) se extiende a 30 días — sigue siendo una sola consulta, ahora
también alcanza para la constancia y no exige un segundo viaje de red. El
contador de repeticiones sí es una consulta nueva por hábito
(`count: 'exact', head: true` sobre `habit_completions` filtrado por
`habit_id`), con el mismo patrón que ya usa `useHabitStreaks` para pedir la
racha de cada hábito en paralelo.

**Decisión de producto.** Este cambio revierte una postura implícita — que la
racha es la métrica principal de un hábito — y por eso necesita una entrada
en `docs/decisions.md` (texto entregado aparte, para que el dueño la aplique)
y un ajuste en `docs/product-spec.md` §2 "Hábito" y §3 "Hábitos" (texto
entregado aparte, mismo motivo).

**Fuera de alcance** — cualquier texto motivacional o educativo más allá de
la única línea de referencia; puntajes, insignias, niveles o rachas de otro
tipo; comparación con otras personas o con un "promedio"; cualquier gráfico o
curva de progreso (ver `design.md`, sección "Por qué no se dibuja la curva");
cualquier columna o tabla nueva; y **encadenar un hábito a otro** ("después
de Meditar, Leer") — se investigó como parte del mismo pedido original y se
descartó por ahora: entre recordatorios sin hora fija que dependerían de
completar otro hábito, cómo se comporta el bloque del calendario, qué pasa
con la racha del encadenado si el ancla no se hizo, la validación de ciclos
(A→B→A) y el cruce con frecuencias distintas entre ancla y encadenado, el
costo y el criterio de diseño que exige superan el retorno esperado por
ahora. Queda como idea evaluada y rechazada, no como pendiente.
