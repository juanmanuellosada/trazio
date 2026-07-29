## Context

La lista del dueño en esta ronda es de fricción, no de arquitectura. Casi todo es acotado. Pero **tres puntos cambian decisiones ya tomadas y escritas**, y este design existe sobre todo para resolverlos con precisión, porque uno de ellos toca el contrato del parser — el documento que el propio proyecto declara fuente de verdad.

## Goals / Non-Goals

**Goals:**

- Invertir los símbolos del parser **completo**: reconocedor, contrato, documentación y demo de la landing. A medias es peor que no hacerlo.
- Que las etiquetas dejen de estar a medias.
- Sacar la fricción de los selectores: escribir donde hoy solo se puede elegir.

**Non-Goals:**

- No se toca nada más de la fase 2: la página por etiqueta, las favoritas, los filtros y los recordatorios siguen ahí.
- No se rediseña lo que el cambio anterior dejó funcionando.

---

## Decisions

### A. La inversión de símbolos

**A1 — `#` pasa a proyecto y sección, `@` a etiqueta.** Es lo contrario de lo que fija el contrato en los casos 40, 41, 42, 43 y 53, y de lo que dice `docs/product-spec.md` §6.

El argumento que la decide: **el público del producto viene de Todoist**, que usa esa convención. `docs/landing.md` describe a ese público explícitamente. Que el símbolo haga lo que la persona espera vale más que la coherencia con el hashtag de internet, sobre todo cuando el error se descubre después de haber creado la tarea mal.

**A2 — El cambio es de contrato, no de interfaz, y hay que hacerlo entero.** Cuatro lugares:
1. `docs/parser-test-cases.md`, los cinco casos.
2. El reconocedor de símbolos.
3. `docs/product-spec.md` §6.
4. **La demo de la landing**, que usa el caso 53 con `#trabajo @Proyectos` — al invertirse, ese ejemplo pasa a decir otra cosa.

El test que compara el contrato contra el código va a marcar la diferencia apenas se toque uno solo. Eso es deseable: es la red que evita que quede a medias.

**A3 — Los menús son funcionalidad nueva, no el reconocimiento que ya existe.** Hoy el parser resuelve al confirmar y resalta mientras se escribe. Lo que se agrega es que **escribir el símbolo abra un menú para elegir**, que es otra cosa: reconocer texto contra elegir de una lista.

Los dos tienen que convivir. Alguien que escribe `#Trabajo` de corrido sin mirar el menú tiene que terminar con el mismo resultado que alguien que lo elige de la lista. Si el menú se vuelve el único camino, se pierde escribir de corrido, que es el diferencial del producto.

### B. Los nombres de prioridad

**B1 — Se muestra `P1 · Urgente` y no solo `P1`.** El código corto es el que se tipea y el que la persona busca; el nombre es lo que hace entender qué significa sin deducirlo del orden.

Solo `P1` sería más compacto y coherente con Todoist, pero obliga a saber de antemano si uno es lo más urgente o lo menos. El nombre solo pierde la conexión con lo que se escribe. Los dos juntos cuestan un poco de ancho y no dejan a nadie afuera.

**B2 — La prioridad 3 cambia a un azul más visible.** Hay que elegirlo con la validación de contraste que ya existe, y verificarlo en los dos temas. Ojo con no acercarlo al azul de marca, que ya significa otra cosa.

### C. Las etiquetas se adelantan

**C1 — Se completa lo que quedó a medias, no todo.** En la fase 1 se adelantaron las tablas por el contrato del parser, con alcance mínimo: crear con `#`, asignar, mostrar el chip. Ahora se suma administración y el selector con búsqueda.

**La página por etiqueta y las favoritas siguen en fase 2.** Son navegación, no gestión, y no bloquean nada de lo que se está haciendo.

**C2 — El color de las etiquetas usa el mismo selector que los proyectos**, con su paleta y su color personalizado validado por contraste. Que dos cosas que se ven igual se elijan distinto es el tipo de inconsistencia que se nota sin poder nombrarla.

### D. La fricción de los selectores

**D1 — Escribir además de elegir, en hora y duración.** Elegir es cómodo para lo frecuente y torpe para lo específico: nadie quiere buscar "13:47" en una lista. La escritura es el camino rápido de quien ya sabe qué quiere.

**D2 — La duración necesita unidades.** El modelo guarda minutos, y eso no cambia: lo que cambia es que la persona pueda decir "2 horas" en vez de traducir a 120. Es presentación, no esquema.

**D3 — Los accesos rápidos de fecha en dos filas de dos, cada una completa.** Hoy la primera queda corta y se lee como si algo faltara.

### E. Las dos superficies de alta

**E1 — Son distintas a propósito.** Desde el panel lateral, **el modal completo**: quien va ahí quiere anotar algo con todos sus datos. Dentro de una lista o sección, **un modal incrustado y compacto**: quien está ahí ya sabe dónde va la tarea y quiere escribir y seguir.

La diferencia no es capricho: el contexto ya aporta la mitad de la información. Mostrar un selector de proyecto dentro de la sección donde estás parado es ruido.

**E2 — Los dos usan el mismo componente por debajo.** Lo que cambia es cuánto muestran. Si terminan siendo dos implementaciones, volvemos al problema que el cambio anterior resolvió.

### F. El centrado

**F1 — Centrado con un piso.** Se centra cuando el ancho disponible es suficiente para que los márgenes se lean como aire; por debajo, alineado a la izquierda.

Es la síntesis de dos observaciones opuestas del mismo dueño, y las dos eran ciertas en su momento: centrado dejaba un hueco muerto **cuando la columna era de 768**; ahora es de 1152 y ese hueco casi no existe en pantallas grandes, pero sí en las medianas. El umbral concreto lo define `ui-ux-pro-max`.

### G. El editor

**G1 — La autodetección en línea es la misma clase de regla que ya existe.** Hoy detecta títulos y listas al empezar un bloque. Falta el formato dentro del párrafo mientras se escribe. Es completar el conjunto, no un mecanismo nuevo.

Sigue valiendo lo de siempre: se guarda documento estructurado, no texto con marcas.

---

## Risks / Trade-offs

**La inversión de símbolos puede quedar a medias.** → Es el riesgo real. Se mitiga con el test que compara contrato y código, que falla apenas se toque uno solo de los cuatro lugares. Y la demo de la landing es el más fácil de olvidar porque vive lejos del parser.

**Los menús pueden matar la escritura de corrido.** → Si el menú roba el foco o el teclado, escribir `#Trabajo ` de corrido se vuelve imposible y se pierde el diferencial. Tiene que poder ignorarse por completo.

**El selector de proyecto con secciones anidadas puede ser largo.** → Con muchos proyectos y secciones, la lista se vuelve inmanejable sin búsqueda.

**Cambiar los nombres de prioridad toca lo ya archivado.** → Los specs de la fase 1 y el sistema visual fijan Urgente, Alta, Media y Baja. Hay que actualizarlos, no dejar dos vocabularios conviviendo.

## Migration Plan

No hay migración de datos: la inversión de símbolos cambia cómo se interpreta lo que se escribe de ahora en más, no lo guardado. Las tareas que ya tienen proyecto y etiquetas no se tocan.

El único cuidado es de secuencia: el contrato, el reconocedor, el spec y la demo tienen que viajar juntos.

## Open Questions

Ninguna. Las cuatro decisiones que este cambio necesitaba —la inversión de símbolos, los nombres de prioridad, el adelanto de las etiquetas y el criterio de centrado— se resolvieron con el dueño antes de escribir esto.
