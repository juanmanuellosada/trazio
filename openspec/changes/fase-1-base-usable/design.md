## Context

El repositorio tiene siete documentos de especificación y cero código. La documentación es densa y en general precisa, pero fue escrita antes de que existiera una implementación, y al leerla íntegra aparecen **27 huecos** que no se pueden diferir: cosas que la doc menciona sin definir, o que dos documentos definen distinto.

Este design existe sobre todo para resolverlos. La mitad son del parser, que es la pieza que define la arquitectura del alta rápida y el diferencial declarado del producto. La otra mitad son de infraestructura y modelo de datos.

Cada hueco aparece abajo con una **propuesta de resolución**. Las que necesitaban que decidiera el dueño del proyecto están resueltas en **Decisiones resueltas**, no acá.

Restricciones que enmarcan todo lo que sigue, y que no se re-litigan: 100% online, español rioplatense únicamente, título de tarea en texto plano, una persona por cuenta, RLS en la misma migración que crea la tabla, `due_date` y `due_at` excluyentes, borrado físico, Server Components por defecto, sin librería de estado global.

## Goals / Non-Goals

**Goals:**

- Dejar la fase 1 implementable sin decisiones pendientes: al terminar de leer este documento, `tasks.md` es mecánico.
- Fijar el contrato del parser con precisión suficiente para escribir la suite de Vitest **antes** de la primera línea de lógica.
- Fijar versiones, variables de entorno, valores por defecto y enumeraciones que hoy no existen en ningún documento.
- Que cada uno de los 10 criterios de aceptación del roadmap tenga un mecanismo de verificación concreto.

**Non-Goals:**

- No se diseña nada de fases 2, 3 o 4. Cuando una decisión de fase 1 condiciona una fase posterior se dice explícitamente, pero no se resuelve acá.
- No se elige paleta, tipografía ni estilo visual: eso lo define la skill `ui-ux-pro-max` cuando empiece el trabajo de interfaz, y este documento no la adelanta.
- No se diseña la ejecución de la recurrencia. El parser emite RRULE (casos 31–37), la columna `recurrence_rule` se guarda, y nada la lee todavía.

---

## Decisions

### A. Plataforma y versiones

**A1 — Versiones fijadas.** Ninguna aparece en la documentación. Propuesta: Node 24 LTS (declarado en `.nvmrc` y en `engines`), Next.js 16 (App Router), React 19, TypeScript 5.9+ con `strict`, Tailwind v4, pnpm 11. Las versiones menores exactas se congelan en el `package.json` al momento del scaffolding y se verifican contra el registro en ese momento, no ahora.

Tailwind v4 es la decisión con más consecuencias: cambia la instalación de shadcn/ui (configuración por CSS en vez de `tailwind.config.js`). Se elige igual porque arrancar un proyecto nuevo en v3 es nacer con una migración pendiente.

**A2 — Variables de entorno.** Hoy solo están documentadas las tres de Google, que son de fase 4. Las de fase 1:

| Variable | Alcance | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente + servidor | Clave publicable |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | Operaciones administrativas. Nunca `NEXT_PUBLIC_*`, nunca en componente cliente, nunca en logs |
| `NEXT_PUBLIC_SITE_URL` | cliente + servidor | Redirects de OAuth y links de los correos |
| `RESEND_API_KEY` | solo servidor | Confirmación y reset |

Las credenciales de Google OAuth se cargan en el panel de Supabase, no en el entorno de la app. Las de VAPID llegan en fase 2 con push.

**A3 — Ruta de la Bandeja en español.** `AGENTS.md` declara `app/(app)/inbox/` en inglés dentro de una estructura toda en español, y `.claude/rules/copy.md` prohíbe la palabra "inbox". Propuesta: la ruta es `app/(app)/bandeja/`, y se corrige `AGENTS.md`. Una URL es texto de cara al usuario.

**A4 — `logo.png`.** Está en la raíz sin que ningún documento lo mencione. Propuesta: se mueve a `public/`, y es la fuente de los íconos de la PWA (192, 512 y maskable). El ícono descrito en el spec §12 —recuadro azul con dos checks, el de arriba blanco y el de abajo rojo— se toma de ahí.

### B. Datos, RLS y el esquema de fase 1

**B1 — Siete tablas.** `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels`, `task_labels`. Las demás del `data-model.md` pertenecen a fases posteriores y no se crean por adelantado: una tabla vacía con RLS es deuda, no preparación.

**B2 — Cada tabla, una migración, con su RLS y sus índices adentro.** Las cuatro políticas del `data-model.md` con `(select auth.uid()) = user_id`, textualmente. Índice en `user_id` siempre, más los de la sección "Índices" que correspondan a fase 1: `(user_id, due_date)`, `(user_id, due_at)`, `(user_id, project_id, position)`, `(user_id, completed_at)`, `(parent_id)`. El índice GIN de búsqueda en español es de fase 2 y no se crea ahora.

**B3 — Aprovisionamiento de cuenta.** Un trigger `on auth.users insert` crea las tres filas iniciales en una sola transacción: `profiles`, `user_preferences` y el proyecto Bandeja. Valores iniciales de la Bandeja, hoy indefinidos: `name = 'Bandeja de entrada'`, `is_inbox = true`, `color = '#283B56'` (azul de marca), `icon = null`, `position = 0`, `parent_id = null`. Se deja `icon` nulo a propósito: la interfaz dibuja un ícono fijo para la Bandeja y no un emoji, coherente con que no se puede renombrar ni borrar.

Protección de la Bandeja a nivel base de datos, no solo de interfaz: índice único parcial que garantiza un solo `is_inbox = true` por usuario, más un trigger `before delete or update` que rechaza borrarla, archivarla o quitarle el `is_inbox`.

**B4 — Valores por defecto y enumeraciones que faltaban.**

- `tasks.priority` default `4` (Baja). La tabla no lo declaraba.
- `tasks.completed_at` default `null` — pendiente.
- `user_preferences.date_format`: `'dd/MM/yyyy'` (default) | `'yyyy-MM-dd'`. Dos valores, validados por check constraint y por Zod. No hay formato mes-primero: sería incoherente con R1 del parser.
- `user_preferences.default_view`: en fase 1 solo `'bandeja'` (default) | `'hoy'`. `'proximos'` se agrega en fase 2.
- `user_preferences.timezone` default `'America/Argentina/Buenos_Aires'`, `theme` default `'system'`, `time_format` default `24`, `week_starts_on` default `1` (lunes).
- Colores de proyecto: **paleta fija**, no color libre — decisión confirmada (ver OQ6 en **Decisiones resueltas**). Un `text` sin restricción produce proyectos con contraste ilegible y rompe el modo oscuro. La paleta concreta, de alrededor de 10 colores con nombre, la define la skill `ui-ux-pro-max`; el esquema la impone con check constraint y Zod comparte la lista desde `lib/validation/`.

**B5 — `position` y rebalanceo.** `numeric`, inserción por promedio entre vecinos. El truco está documentado pero no qué hacer cuando se agota la precisión: propuesta, espaciado inicial de 1000 entre hermanos, y cuando la diferencia entre dos vecinos baja de `0.0001`, una función rebalancea los hermanos de ese padre en una sola transacción. En uso normal no se dispara nunca.

**B6 — Un trigger valida el dueño al mover.** Consecuencia declarada de D11 (`user_id` redundante): al mover una tarea, un trigger verifica que el `project_id` y el `section_id` destino pertenezcan al mismo `user_id`. Sin eso, el `user_id` redundante permite escribir filas incoherentes que RLS no detecta.

### C. Autenticación

**C1 — `@supabase/ssr` con tres clientes.** Servidor (Server Components y Route Handlers), navegador, y el de middleware que refresca la sesión. El middleware protege `app/(app)/**` y redirige a login conservando el destino.

**C2 — Reset de contraseña de punta a punta.** Es criterio de aceptación y el flujo entero tiene que existir: pedir el correo → Resend envía el link → página de reset real que valida el token → nueva contraseña → sesión iniciada. Se prueba en e2e leyendo el correo desde el entorno de prueba, no a mano.

**C3 — Contraseña de 8 caracteres o más**, validada con el mismo esquema de Zod en cliente y servidor, y también en la configuración de Supabase Auth. Tres capas porque la validación de cliente es cortesía, no seguridad.

### D. Datos en el cliente: Server Components, TanStack Query, Realtime

**D1 — Lectura inicial en el servidor, mutaciones en el cliente.** Cada vista es un Server Component que lee con el cliente de servidor de Supabase y siembra el caché de TanStack Query. Las mutaciones y la invalidación viven en el cliente. Sin librería de estado global (D12).

**D2 — Optimistic updates.** Obligatorios en completar, editar, mover y reordenar. Patrón estándar: `onMutate` cancela queries en vuelo, guarda el snapshot y aplica el cambio; `onError` revierte y muestra un toast que explica qué pasó, por qué y qué hacer, según `.claude/rules/copy.md`; `onSettled` invalida.

**D3 — Convivencia de Realtime con una mutación en vuelo.** Hueco real: nadie definió qué pasa cuando llega un evento de Realtime mientras hay un optimistic update sin resolver. Sin regla, el evento pisa el valor optimista y la interfaz parpadea.

Propuesta: el manejador de Realtime consulta `queryClient.isMutating()` para las claves afectadas. Si hay mutaciones en vuelo, **no invalida**: marca la clave como sucia y deja que el `onSettled` de la mutación haga la invalidación. Si no hay ninguna, invalida en el acto. Nunca se muta el caché a mano, como manda `.claude/rules/frontend.md`.

**D4 — Detección de "sin internet".** Es criterio de aceptación y el mecanismo no estaba definido. Propuesta de tres señales, sin polling:

1. `navigator.onLine` — negativo rápido y barato, pero no confiable en positivo (dice "online" con wifi sin salida).
2. Fallo de red de una query o mutación de TanStack Query — la señal autoritativa, porque es el mismo canal por el que la app escribe.
3. Estado del canal de Realtime — confirma la pérdida sostenida.

Se considera offline si (1) es falso, o si (2) falla y (3) está caído. En offline: cartel persistente, campos de escritura deshabilitados y botones de acción inertes. Nada de cola de mutaciones, nada de caché: D1 es explícita y la app avisa en vez de prometer.

Se descarta el healthcheck periódico: gasta batería y pedidos para responder algo que el tráfico real ya contesta.

### E. El parser de lenguaje natural

El contrato es `docs/parser-test-cases.md`: 56 casos y 8 reglas. La tabla manda. Todo lo de abajo son **reglas nuevas que el contrato no cubría** y que hacían falta para poder implementarlo. Si alguna se acepta, se escribe primero en el contrato y se anota en `docs/decisions.md`, como manda el propio archivo.

**E0 — Principio rector, decidido por el dueño: ante ambigüedad, extraer menos.** Un atributo de menos lo corrige el usuario en dos segundos; uno de más lo descubre cuando le suena una notificación que no esperaba. Toda la sección se resuelve en esa dirección.

**E1 — Función pura, sin reloj propio.** `parse(texto, { ahora, zonaHoraria, semanaEmpiezaEn, proyectos, etiquetas })`. El parser nunca lee `Date.now()` ni el `Intl` del sistema. Es la única forma de que los tests sean deterministas y de que "mañana a las 10" se resuelva en la zona IANA del usuario y no en la del servidor, cosa que ningún documento decía explícitamente.

**E2 — No tira excepciones, nunca.** Ante cualquier entrada, el peor resultado posible es "el texto entero como título, sin atributos". El `parse` está envuelto en un borde que garantiza esa salida. Corre en cada tecla con debounce de 120 ms.

**E3 — Arquitectura: reconocedores independientes + resolución por prioridad.** Cada categoría (fecha relativa, fecha puntual, día suelto, hora, duración, repetición, símbolos) es un reconocedor que devuelve *candidatos* con su rango de caracteres en el texto. Después una fase de resolución los ordena, aplica R4 y R5, descarta los perdedores y recién ahí se remueven los rangos ganadores del título.

Se elige esto sobre una pasada única con expresiones regulares encadenadas porque R4 ("el día suelto solo como último recurso") y R5 ("gana la primera reconocida") son reglas *entre* categorías: no se pueden expresar dentro de un reconocedor aislado. Los casos 44–52 son los que fuerzan esta arquitectura, y por eso se escriben primero.

**E4 — Regla nueva R8: qué preposición se lleva el token.** El contrato es inconsistente en la superficie: el caso 14 deja `Vence el`, el 21 deja `Reunión el con el equipo del lunes`, pero el 50 sí se come el `de` de `de mañana`.

No es inconsistencia real, es una regla que nadie escribió: **la preposición o el artículo se consumen solo cuando son parte léxica de la locución que desambigua** (`de mañana`, `esta mañana`, `pasado mañana`, `este fin de semana`, `próxima semana`, `en 3 días`, `a las 3`, `por 45min`, `cada lunes`). Un determinante suelto delante de una fecha numérica o nominal (`el 15 de marzo`, `el 20/08`) **no** es parte del token y queda en el título.

Esa regla reproduce los tres casos exactamente. Corolario: al remover un rango del medio del texto, los espacios se normalizan —secuencias de espacio colapsan a uno, se recortan los extremos— pero **no** se tocan los artículos huérfanos. El título del caso 21 queda tal cual está escrito en el contrato.

**E5 — Hora ya pasada: no hay rollover.** Los casos 22–26 resuelven a hoy. Si son las 18:00 y el usuario escribe `Dentista 3pm`, la tarea queda hoy 15:00, vencida, visible en "atrasadas" dentro de Hoy. No se corre a mañana.

Correr la fecha sería inventar intención, que es exactamente lo que E0 prohíbe. Y una tarea atrasada es visible y se arregla en un clic, mientras que una silenciosamente movida a mañana no se nota. Consecuencia para los tests: la suite congela el reloj, si no los casos 22–26 son irreproducibles.

**E6 — R5 se precisa: "primera" es primera en el texto.** El contrato dice "gana la primera reconocida" sin decir si es orden de aparición o de pasada del parser. Propuesta: **orden de aparición en el texto, de izquierda a derecha**. Es la única que se le puede explicar al usuario, y no depende de en qué orden corran los reconocedores.

Además, R5 aplica por atributo, y `#` está exento porque las etiquetas son multivaluadas — el caso 43 lo demuestra pero ninguna regla lo dice. `@` no está exento: un solo proyecto por tarea.

**E7 — Tokenización de `@` y `#`.** El hueco más grave del contrato: nada define hasta dónde llega el token, y el caso 42 (`@Trabajo/En curso`) tiene un espacio adentro del nombre de la sección.

Propuesta:

- `#etiqueta` — desde el `#` hasta el primer espacio o símbolo. Las etiquetas no llevan espacios.
- `@` — **coincidencia más larga contra la lista real de proyectos y secciones del usuario**, que el parser recibe como entrada (E1). Así `@Trabajo/En curso` funciona sin inventar reglas de comillas. Si no hay coincidencia, el token llega hasta el primer espacio y se ofrece crear.
- `/` separa segmentos. Se resuelve primero contra el árbol de proyectos (ruta más larga que coincida, hasta 3 niveles), y el segmento sobrante se busca como sección dentro de ese proyecto. Ante empate entre un proyecto y una sección con el mismo nombre, **gana el proyecto**.
- Comparación sin distinguir mayúsculas ni acentos, en las dos direcciones (`@Trabajo` y `#trabajo` coinciden con `Trabajo` y `trabajo`).

**E8 — Año de dos dígitos.** El caso 17 usa `15-03-27` → 2027 y no hay regla de pivote. Propuesta: `YY` siempre es `20YY`. Un gestor de tareas no agenda nada en 1927; un pivote de siglo es complejidad sin caso de uso.

**E9 — Candidato descartado no se resalta.** El caso 21 detecta "lunes" y lo tira por R4. R7 dice que "todo token reconocido se muestra resaltado", lo que dejaría un resaltado sobre una palabra que no produjo nada. Propuesta: **se resalta lo que produjo un atributo**, no lo que se consideró. Precisión sobre R7.

**E10 — R7 se prueba aparte.** Es la única regla sin caso en la tabla porque es de interfaz, no de parsing. Se cubre con tests de componente sobre el alta rápida: resaltado visible, doble clic desactiva, el atributo desaparece, el token vuelve a texto común y el título final lo incluye.

**E11 — `deadline` no tiene token.** El caso 14 mapea `Vence el 15 de marzo de 2027` a `due_date`, aunque el verbo "vence" sea justo la semántica de la columna `deadline`. Se respeta el contrato: en fase 1 `deadline` se carga solo desde el detalle de la tarea. Reconocer "vence" como `deadline` sería adivinar, y el contrato ya decidió.

**E12 — Recurrencia: ancla solo cuando hay hora.** Los casos 31–37 emiten RRULE y ninguna fecha: **la recurrencia sola no fija ancla**, y eso no cambia. En fase 1 el RRULE se guarda tal cual en `recurrence_rule` y nada lo lee: la ejecución es fase 2. **No se inventa un `due_date = hoy` como ancla** para estos casos, porque contradice el contrato y E0.

Precisión forzada por el caso nuevo de OQ5(a): **la recurrencia acompañada de una hora sí fija ancla**, en `due_at`, en la próxima ocurrencia que cumple la regla — si no se fijara, el token de hora se reconocería y se descartaría en silencio, que es justo lo que el contrato no permite. Para `Gimnasio cada lunes a las 8` eso da RRULE `FREQ=WEEKLY;BYDAY=MO` más `due_at` = próximo lunes 08:00 (la hora 8 es AM por R3). Cuando no hay hora, la fase 2 sigue decidiendo desde dónde arranca la serie.

**E13 — Zona horaria de los tests.** El contrato pide correr en `America/Argentina/Buenos_Aires` "y al menos una zona con offset distinto" sin decir cuál. Propuesta: `Pacific/Kiritimati` (UTC+14). Es la que más expone corrimientos de día contra UTC−3, que es exactamente lo que se quiere atrapar.

**E14 — Dónde viven los tests.** El contrato exige tests desde el primer commit pero no dice dónde ni cómo. Propuesta: `lib/parser/casos.ts` es un módulo de datos que refleja 1 a 1 la tabla del markdown, y `lib/parser/parser.test.ts` la recorre. Un test extra afirma que la cantidad de casos es 53: si alguien edita el markdown sin tocar el código, o al revés, la suite se pone roja en vez de divergir en silencio.

Orden de escritura: primero los casos 44–52, después el 53, después el resto. Los difíciles definen la arquitectura; arrancar por los fáciles produce un parser que hay que tirar.

**E15 — "próxima semana" sigue `week_starts_on`.** El caso 6 fijaba lunes duro, pero `week_starts_on` admite domingo, lunes o sábado. Resuelve al primer día de la semana siguiente según la preferencia del usuario, no a un lunes duro. El caso 6 del contrato pasa a aclarar que asume el default (lunes).

**E16 — "lunes" y "próximo lunes" nunca resuelven a hoy.** Si hoy es lunes, ambas expresiones resuelven a hoy+7, nunca a hoy. Quien quiere hoy escribe "hoy". Es la lectura conservadora de E0.

**E17 — "este fin de semana" sí resuelve a hoy cuando hoy cae en el fin de semana.** Si hoy es sábado o domingo, "este fin de semana" es hoy. Si no, es el próximo sábado. Acá la lectura literal coincide con la expectativa, al revés que en E16: en ese caso el texto también parece pedir "hoy" pero no lo hace.

**E18 — Tres casos nuevos en el contrato.**
- Repetición con hora: `Gimnasio cada lunes a las 8` — ver E12.
- Entradas sin acentos o en mayúsculas: `manana` y `MAÑANA` tienen caso propio, verificando la comparación sin distinguir mayúsculas ni acentos que E7 ya preveía.
- Texto parcial: `Comprar pan mañ` no produce ningún atributo, porque el parser corre en cada tecla (E2) sobre texto incompleto y "mañ" todavía no es una locución reconocible.

### F. Vistas y tareas

**F1 — Contador de Hoy: en fase 1 son solo tareas.** El spec dice que suma tareas y hábitos, pero los hábitos son fase 3. Ningún documento lo aclaraba.

**F2 — Duplicar una tarea.** No estaba definido qué copia. Propuesta: copia los campos propios y **las subtareas, recursivamente**. No copia `completed_at` (el duplicado nace pendiente) ni la fecha de creación. Comentarios y recordatorios no existen en fase 1. El título va sin sufijo — nada de "(copia)" — y la copia se inserta inmediatamente después del original.

**F3 — Ruta de una tarea suelta.** "Copiar enlace directo" no tenía ruta a la que apuntar. Propuesta: `app/(app)/tarea/[id]/page.tsx`, pantalla completa y con su propio `<title>`. Dentro de la app el detalle sigue siendo el panel lateral; esa ruta es el destino del enlace copiado y de abrir en ventana aparte.

**F4 — Vistas en modo lista, y nada más.** El panel y el calendario son fases posteriores. La barra de opciones de vista tampoco existe todavía: el orden en fase 1 es el manual (`position`), sin agrupación ni filtros de vista.

**F5 — Barra inferior de teléfono: tres accesos en fase 1, no cuatro.** Bandeja de entrada, Hoy y Agregar. El cuarto lugar queda vacío a propósito hasta que exista Próximos en fase 2, para que nadie se acostumbre a una posición que después cambia.

### G. Landing

**G1 — Servidor entero salvo la demo.** Una sola isla cliente: el campo de la demo del parser. El parser ya es una función pura del cliente (E1), así que la demo lo importa directo sin API.

**G2 — La demo usa el caso 53.** `Reunión con Ana el próximo martes a las 3pm por 45min p2 #trabajo @Proyectos` es el ejemplo del contrato y el que conviene tener andando primero. Los otros tres ejemplos precargados son los de `landing.md`. La demo pasa `proyectos` y `etiquetas` vacíos, así que `@Proyectos` y `#trabajo` se muestran como "se crearía".

**G3 — Analítica: Vercel Analytics.** Cuatro métricas —visitas, clics en el CTA, interacciones con la demo, registros completados— resueltas con lo que ya viene del host. Las dos últimas son eventos personalizados. Es lo más liviano posible, y `landing.md` pide explícitamente no instalar un stack pesado para cuatro números.

**G4 — Términos y privacidad existen en fase 1.** El pie las linkea, así que no pueden ser links rotos. Se crean como páginas estáticas en `app/(marketing)/`, con maquetado y metadatos. El texto lo escribe el dueño: no es una decisión técnica, y D3 (sin exportar datos) tiene implicancias sobre la Ley 25.326 que exceden a este documento.

**G5 — Lighthouse por encima de 90** en rendimiento y accesibilidad se verifica en CI sobre el deploy de preview, no a ojo.

### H. PWA

**H1 — Hace falta un service worker aunque no haya caché.** Tensión que nadie vio: `AGENTS.md` dice "service worker solo para push" y push es fase 2, pero los navegadores basados en Chromium exigen un service worker registrado para ofrecer la instalación, que es criterio de aceptación de fase 1.

Propuesta: un service worker mínimo, sin manejador de `fetch` y sin caché de ningún tipo. Satisface la instalabilidad y no viola D1, porque no guarda nada. En fase 2 ese mismo archivo suma el manejador de push. Queda escrito en el código por qué existe.

**H2 — Manifest** con `display: standalone`, íconos 192/512/maskable derivados de `logo.png`, y color de tema el azul de marca.

---

## Risks / Trade-offs

**El alcance es grande y es una sola propuesta.** → Es lo que manda `CLAUDE.md` ("cada fase del roadmap es una propuesta"). Se mitiga con `tasks.md` en 12 bloques según el orden de `KICKOFF.md`, cada uno verificable por separado. Los bloques 1 a 3 son el camino crítico: nada se puede probar de verdad hasta que la auth funcione.

**El parser puede irse de tiempo.** → Es el riesgo real de la fase. Se mitiga escribiendo los 56 casos como suite antes de la lógica, empezando por los críticos. El día que la suite pasa entera, el parser está listo; no hay criterio subjetivo.

**Tailwind v4 + shadcn/ui es terreno más nuevo que v3.** → Se acepta: nacer en v3 es nacer debiendo una migración. Si la instalación de shadcn se traba, se resuelve consultando `context7` y la skill `vercel:shadcn` antes que improvisando.

**Realtime más optimistic updates es la combinación más fácil de romper.** → D3 fija la regla. Se cubre con un test que dispara un evento de Realtime con una mutación en vuelo y verifica que la interfaz no parpadee.

**La landing va última y depende de capturas del producto real.** → Es a propósito (`KICKOFF.md`). El riesgo es que quede apurada al final; se mitiga tratándola como un bloque propio con su propio criterio medible (Lighthouse), no como un adorno.

**Doce capacidades nuevas de una.** → Los deltas de spec quedan largos. Se acepta: es el primer cambio del proyecto y esos specs pasan a ser la base contra la que se escriben las fases 2 a 4.

## Migration Plan

No hay migración de datos: el proyecto nace vacío y no hay usuarios. El despliegue es incremental sobre previews de Vercel, y la rama principal solo recibe bloques que pasan el gate `pnpm lint && pnpm typecheck && pnpm test`.

Las migraciones de base de datos son de ida: `.claude/rules/database.md` prohíbe editar una migración ya aplicada. Un error se corrige con una migración nueva. Cada una se prueba primero contra el Supabase local antes de ir al proyecto remoto.

## Decisiones resueltas

Estas necesitaban que decidiera el dueño del proyecto. Las 8 quedaron resueltas. Se mantiene la numeración OQ1 a OQ7 como referencia histórica, para que las tareas de `tasks.md` que ya las mencionan sigan teniendo sentido.

**OQ1 — Etiquetas: se adelantan a fase 1.** Se crean `labels` y `task_labels` con RLS. Alcance mínimo: crear una etiqueta por `#` desde el alta rápida, asignarla a la tarea, mostrar el chip, y agregar o quitar etiquetas desde el detalle de la tarea (al editar se reemplaza el conjunto completo). No entran en fase 1 la página de administración de etiquetas, la página propia por etiqueta, las favoritas ni el acceso "Etiquetas" del panel lateral. Esto agrega una capacidad nueva, `etiquetas`, y la propuesta pasa de 11 a 12 capacidades. Se elige adelantarlas porque son dos tablas chicas y mantienen el contrato del parser entero, que es el criterio de aceptación más visible de la fase.

**OQ2 — "próxima semana" depende de `week_starts_on`.** Resuelve al primer día de la semana siguiente según la preferencia del usuario, no a un lunes duro. El caso 6 del contrato pasa a aclarar que asume el default (lunes). La alternativa —lunes siempre— era más simple pero le mentía a quien configuró que su semana empieza el domingo.

**OQ3 y OQ4 — comportamiento asimétrico cuando la fecha cae hoy.** "lunes" y "próximo lunes" un lunes resuelven a hoy+7, nunca a hoy: quien quiere hoy escribe "hoy" (lectura conservadora de E0). Pero "este fin de semana" un sábado o un domingo resuelve a hoy, porque ahí la lectura literal sí coincide con la expectativa. Son dos casos con la misma lógica de fondo —extraer solo lo que el texto dice sin ambigüedad— que dan resultados distintos porque la expectativa del usuario es distinta en cada uno.

**OQ5 — se agregan tres casos al contrato.** (a) Repetición con hora, `Gimnasio cada lunes a las 8`, que fuerza precisar E12 — ver esa sección. (b) Entradas sin acentos o en mayúsculas, `manana` y `MAÑANA`, que ahora tienen caso propio verificando la comparación sin distinguir mayúsculas ni acentos de E7. (c) Texto parcial, `Comprar pan mañ` → ningún atributo, porque el parser corre en cada tecla (E2) sobre texto incompleto.

**Versiones confirmadas.** Node 24 LTS, Next.js 16, React 19, TypeScript 5.9+ `strict`, Tailwind v4, pnpm 11. Queda como estaba en A1, sin cambios.

**Barra inferior de teléfono: tres accesos en fase 1, no cuatro.** Bandeja de entrada, Hoy y Agregar. El cuarto lugar queda vacío a propósito hasta que exista Próximos en fase 2, para que nadie se acostumbre a una posición que después cambia. Se eligió por encima de poner Completado ahí.

**OQ6 — paleta fija de colores de proyecto.** Alrededor de 10 colores con nombre, definida por la skill `ui-ux-pro-max`, validada por check constraint en la base y por Zod en el cliente. No hay color libre.

**OQ7 — términos y privacidad.** El dueño escribe el texto; las páginas se maquetan igual, en `app/(marketing)/`, con metadatos.
