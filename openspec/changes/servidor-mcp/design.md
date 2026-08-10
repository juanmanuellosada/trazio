## Context

Trazio tiene diecinueve tablas, todas con RLS por `user_id`, y un lenguaje de
consulta (`lib/query-language/`, capacidad `lenguaje-de-consulta`) que ya
compila a un AST puro sin dependencias de navegador ni de React — se verificó
leyendo los imports de `parse.ts`, `tokenize.ts`, `ast-utils.ts`,
`validate-values.ts` y `field-reference.ts`: ninguno importa nada fuera de
`zod` y de sí mismos. Eso es lo que hace viable un MCP chico: en vez de una
herramienta por pantalla (Bandeja, Hoy, Próximos, Etiqueta, Filtro,
Buscador), casi toda la lectura de tareas pasa por una sola consulta en el
mismo lenguaje que ya usa la barra de búsqueda.

Este documento separa con cuidado tres clases de afirmación, porque no tienen
el mismo peso:

1. **Validado empíricamente** contra el stack local de Supabase (GoTrue
   v2.193.1) — marcado como tal, con lo que se probó.
2. **Deducido leyendo el código**, no probado rompiéndolo — marcado como tal,
   con una tarea de verificación en `tasks.md` antes de construir encima.
3. **Suposición a validar en la primera ola** — el transporte HTTP en Vercel.

**Actualización (2026-08-10): la Ola 1 de `tasks.md` se ejecutó.** Todo lo
que estaba en la categoría 2 y 3 ya se probó y quedó en la categoría 1. Varios
resultados **contradicen** lo que este documento asumía en su primera versión
— cada decisión afectada queda marcada abajo como **CORREGIDA**, con el
hallazgo que la corrigió y por qué, en vez de reescribirse como si siempre
hubiera dicho eso. El detalle crudo de cada prueba vive en `tasks.md`, Ola 1.

## Goals / Non-Goals

**Goals:** un asistente conectado puede leer la cuenta completa (salvo
comentarios y recordatorios, ver Non-Goals) y escribir tareas, hábitos,
proyectos, etiquetas y filtros, con un conjunto de herramientas del orden de
nueve — no veinticinco — para no degradar la elección de herramienta del
modelo ni pagar en tokens de contexto en cada pedido.

**Non-Goals:** borrar nada desde el MCP; un scope de permisos de solo
lectura (no existe); crear o editar secciones (la lectura sí las trae, la
escritura no fue parte del alcance acordado); comentarios y recordatorios,
ni lectura ni escritura; reordenar manualmente; cualquier código que use la
`service_role` key — el MCP opera siempre bajo el token del usuario que se
conectó, con las mismas políticas de RLS que la app.

## Decisions

### D-A — La autenticación completa se apoya en el servidor OAuth 2.1 de Supabase (validado, en beta)

**Validado empíricamente:**

- `[auth.oauth_server] enabled = true` en `supabase/config.toml` habilita el
  servidor. La sección ya está scaffoldeada, hoy en `false`.
- El registro dinámico de clientes funciona con
  `allow_dynamic_registration = true`: un `POST` a
  `/auth/v1/oauth/clients/register` devuelve un `client_id` de
  `client_type: public`, sin secreto — un cliente MCP se da de alta solo.
- El access token emitido sirve contra PostgREST y RLS aplica en las dos
  direcciones: con el token de un usuario, `GET /rest/v1/projects` no
  devuelve el proyecto de otro usuario, y un `INSERT` con `user_id` ajeno
  devuelve 403. Un `INSERT` propio con payload válido devuelve 201. Claims
  verificados: `role: "authenticated"`, `aud: "authenticated"`, `sub` = id
  del usuario, `iss` = la URL de auth. Dura 3600 s, con refresh token que
  también se verificó que funciona.
- El RPC `buscar_tareas` se puede invocar con ese token y ejecuta bajo el
  JWT del usuario (`security invoker`).

**Riesgo registrado, no resuelto por este diseño:** la página oficial
(https://supabase.com/docs/guides/auth/oauth-server/getting-started) dice
"OAuth 2.1 server is currently in beta and free to use during the beta
period on all Supabase plans." El contrato puede cambiar sin el mismo
período de aviso que una API estable. Este diseño depende de una pieza que
Supabase mismo llama beta — se acepta y se documenta, no se esconde.

**Cómo se habilita en el proyecto hospedado (validado en la Ola 1, resuelve
la pregunta que este documento dejaba abierta):** `supabase config push`
**no** sincroniza el servidor OAuth — en el código del CLI, las funciones que
lo harían son cuerpos vacíos con `// TODO(cemal) :: implement me`, porque la
función está en beta. Poner `enabled = true` en `config.toml` no hace nada en
producción, y `supabase link` tampoco reporta la deriva: es una
inconsistencia silenciosa, no un error visible. La Management API sí expone
los campos: `PATCH /v1/projects/{ref}/config/auth` con
`oauth_server_enabled`, `oauth_server_allow_dynamic_registration` y
`oauth_server_authorization_path`. El camino reproducible es un script
versionado en el repo que haga ese `PATCH` (`tasks.md`, Ola 3) — no el
`config.toml` ni el panel. Test binario de si quedó prendido: `GET
https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1`
devuelve 404 con `feature_disabled` cuando está apagado. En el hospedado la
ruta de consentimiento sale de **Site URL + Authorization Path** y, por un PR
sin mergear del lado del proveedor, tiene que vivir en el mismo origen que el
Site URL — para Trazio está bien, queda anotado como condición a mantener.

**No confirmado, y no se resuelve acá:** qué pasa con los clientes ya
registrados y los tokens vigentes si el servidor OAuth se desactiva más
adelante, y la fecha de disponibilidad general (GA) del servidor OAuth — que
es lo que destrabaría que `config push` lo sincronice como cualquier otra
sección del `config.toml`. Sin fecha de GA, el costo de mantener el script de
la Management API como mecanismo permanente no tiene horizonte conocido.

### D-B — Falta construir: la pantalla de consentimiento y "aplicaciones conectadas"

El endpoint de autorización redirige a `/oauth/consent?authorization_id=...`
**en la app de Trazio** — Supabase no ofrece una pantalla propia, solo el
protocolo. El flujo: leer `authorization_id` de la query, pedir los detalles
del cliente que pide acceso (`auth.oauth.getAuthorizationDetails`), mostrar
qué aplicación es, y aprobar (`approveAuthorization`) o denegar
(`denyAuthorization`).

**CORREGIDO en la Ola 1 — no hace falta actualizar `@supabase/supabase-js`.**
La primera versión de este documento afirmaba que ninguno de esos cuatro
métodos existía en la versión instalada (2.110.8, `auth-js` 2.112.2 adentro)
y que había que actualizar antes de escribir esta pantalla. Es falso:
verificado en runtime sobre el paquete ya instalado, `c.auth.oauth` existe y
expone `getAuthorizationDetails`, `approveAuthorization`, `denyAuthorization`,
`listGrants` y `revokeGrant`. El error original vino de buscar en
`node_modules/@supabase/auth-js`, una ruta que con pnpm (enlaces simbólicos
anidados) no existe — no de que el método faltara. `tasks.md` ya no lleva la
tarea de actualizar el paquete. Conectar sin poder desconectar se descartó
como inaceptable antes de proponer nada más: por eso "aplicaciones
conectadas" sigue siendo parte de este cambio y no un "más adelante" — ese
razonamiento no cambió, solo la excusa de por qué había que tocar
`package.json` primero.

### D-C — No existe el token de solo lectura (validado), pero el borrado SÍ se puede prohibir desde la base (CORREGIDO en la Ola 1)

Los scopes que el servidor soporta son, según su propia metadata,
exactamente `openid`, `profile`, `email` y `phone`. Pedir uno personalizado
(`trazio:read`) **hace fallar la autorización** — se probó. El scope viaja
como claim en el token, pero como no se puede emitir un scope de permisos,
no hay nada que una política de RLS pueda mirar para diferenciar "puede leer"
de "puede escribir" **en general**. Esa parte sigue siendo cierta y no
cambió.

**Lo que sí cambió — corrección de la Ola 1.** La primera versión de este
documento afirmaba, sin matices, que "el MCP no borra" era una propiedad de
la superficie de herramientas construida y no del token, y que si el token se
filtraba esa propiedad no protegía nada. Es una afirmación demasiado
pesimista: se puede corregir para el caso específico de borrar, que es el que
importa.

Un token OAuth trae un claim `client_id`; una sesión normal de la app,
autenticada por cookie, no. Es el mecanismo que la propia documentación de
Supabase recomienda para discriminar acceso OAuth dentro de una política de
RLS:

```sql
auth.jwt() ->> 'client_id' is null      -- sesión de la app
auth.jwt() ->> 'client_id' is not null  -- vino por OAuth
```

Con eso, una política de `DELETE` puede exigir `auth.jwt() ->> 'client_id' is
null` además de `user_id = auth.uid()`. El resultado: **ningún cliente OAuth
puede borrar, enforceado en la base**, aunque alguien vaya directo contra
PostgREST salteándose por completo las herramientas del MCP. La propiedad
deja de depender únicamente de "qué herramientas construimos" y pasa a
depender también de "qué le permite hacer la base a un token que trae
`client_id`" — las dos capas, no una sola.

**Consecuencia, ya no sin resolver, pero sí acotada:** el token sigue
pudiendo hacer contra PostgREST cualquier `SELECT`, `INSERT` o `UPDATE` que
el usuario podría hacer — eso no cambia, sigue siendo el límite estructural
de no tener scope de permisos. Lo que cambia es específicamente **borrar**:
con las políticas de RLS de `tasks.md` Ola 4 en su lugar, borrar deja de ser
alcanzable por esa vía, sin importar si el MCP expone la herramienta o no.
Esto es trabajo delicado — el mismo repo tiene un commit reciente,
`b2d78b8`, titulado "ocho funciones eran ejecutables por roles que no
debían" — y necesita los tests de RLS (`pnpm test:rls`) antes de darlo por
cerrado, no solo la migración.

**Frases que quedan desactualizadas fuera de este archivo, no tocadas
acá.** D63 de `docs/decisions.md` y `app/(marketing)/privacidad/page.tsx`
afirman hoy, siguiendo la versión anterior de esta decisión, que el token
puede borrar sin ninguna salvedad. Con esta corrección esas frases quedan
desactualizadas y hay que ajustarlas — están fuera del alcance de quien
escribió esta revisión de `servidor-mcp` (no son archivos de `openspec/`) y
quedan señaladas para que se actualicen en un cambio aparte.

### D-D — Lectura: directa contra las tablas, más el RPC del lenguaje de consulta

RLS ya autoriza cada lectura y no hay nada que romper leyendo. Dos caminos:

- **Consultas directas** (`select` acotado por columnas, nunca `select *`,
  siguiendo `.claude/rules/database.md`) para lo que no es "buscar tareas":
  árbol de proyectos y secciones, etiquetas, filtros guardados, hábitos, el
  detalle completo de una tarea puntual.
- **`buscar_tareas(ast jsonb, at timestamptz default now())`** para
  cualquier búsqueda de tareas con criterios — cubre de una sola herramienta
  lo que en la app son seis pantallas (Bandeja, Hoy, Próximos, Proyecto,
  Etiqueta, Filtro) más el Buscador, porque el lenguaje de consulta ya
  expresa proyecto, etiqueta, prioridad, fecha, texto y estado de completado
  combinados con `&`/`|`/`!`.

**Firma real, no la ingenua:** recibe un AST, no un string. `parse.ts` (puro,
sin dependencias de navegador, verificado por sus imports) convierte el
texto del lenguaje de consulta al AST antes de llamar al RPC — se reutiliza
tal cual desde el servidor MCP, sin reescribir el parser.

**Descripción de tarea al leer:** `buscar_tareas` devuelve `t.*`, así que
trae la columna `description` (jsonb de Tiptap) cruda. Un modelo no
interpreta jsonb de forma útil. Se reutiliza `lib/markdown/tiptap-to-markdown.ts`
—ya construido para "copiar como markdown"— para convertir esa columna a
texto antes de devolverla en la respuesta del MCP. Ningún módulo nuevo acá:
es reuso directo.

**Fuera de alcance de lectura:** comentarios y recordatorios. El alcance que
fijó el dueño es tareas, hábitos, proyectos, secciones, etiquetas y filtros
— comentarios y recordatorios no están en esa lista, y `obtener_tarea` no
los trae aunque técnicamente RLS lo permitiría.

### D-E — Escritura: directa donde el esquema protege, con tres excepciones

La regla general: si el esquema ya tiene un `check constraint` o una
restricción que cubre el invariante (`priority between 1 and 4`,
`tasks_due_date_or_due_at_exclusive`, la paleta fija de colores, la
profundidad de proyecto), un `insert`/`update` directo contra PostgREST basta
— no hace falta una función.

Tres casos tienen un invariante que el esquema **no** cubre, y ahí el MCP no
hace un passthrough ingenuo de columnas: envuelve el escritura con la lógica
que protege el invariante, del lado del servidor MCP (TypeScript, en
`app/api/mcp/`), reutilizando módulos existentes en vez de escribir SQL
nuevo cuando ya hay un módulo puro que resuelve lo mismo.

**1. Completar una tarea recurrente (validado: el invariante es real).**

Se verificó que los únicos triggers sobre `tasks` son `set_updated_at`,
`validate_owner` y `recalculate_relative_reminders` — ninguno de recurrencia
— y que `createNextRecurringOccurrence` (`lib/recurrence/create-next-occurrence.ts`)
se llama solo desde `lib/tasks/mutations.ts`, un hook de React. Un `UPDATE`
directo poniendo `completed_at` sobre una tarea recurrente mata la
recurrencia en silencio: se marca hecha y nunca vuelve.

`createNextRecurringOccurrence` recibe un `SupabaseClient` y un `taskId`, y
no depende de React ni de ningún contexto de navegador (su propio comentario
lo dice: "así esta función no depende de `useUserPreferences()` ni de ningún
contexto de React"). Es reutilizable tal cual desde un route handler de
Next.js. La herramienta `completar_tarea` del MCP hace, en ese orden:
`UPDATE tasks SET completed_at = now() WHERE id = :id` (si
`completado: true`) o `SET completed_at = null` (si `completado: false`, sin
ningún efecto lateral, igual que en la app), y si el `completed_at` quedó
puesto, llama a
`createNextRecurringOccurrence(supabase, id)` con el mismo cliente
autenticado con el token del usuario. Cero SQL nuevo para este caso.

**2. Escribir la descripción (CORREGIDO en la Ola 1 — la hipótesis original era parcialmente falsa).**

La primera versión de este documento asumía, sin probarlo, que un modelo que
escribe texto plano en `description` corrompe el campo, y pedía un módulo
nuevo (`lib/tiptap/text-to-tiptap.ts`) para evitarlo. Se probó insertando
valores corruptos en `tasks.description` y renderizando con
`ReadOnlyDescription` y el editor, y el resultado contradice esa hipótesis en
la parte que importa:

- **Un string plano no corrompe nada.** Tiptap trata un `content` de tipo
  string como **HTML**, lo parsea y produce `<p>texto</p>`. Renderiza bien,
  sin excepción ni warning. Con `<script>alert(1)</script>hola` el parser
  descarta el script porque no está en el schema — no hay vía de XSS.
- **El riesgo real es un objeto que no sea un doc válido** (por ejemplo
  `{text: "..."}`, que es lo que un modelo inventaría sin ver el schema).
  Ahí Tiptap no lanza excepción: la atrapa internamente, escribe un
  `console.warn` que nadie ve en producción, y renderiza vacío — **pérdida
  silenciosa del contenido anterior**. Un número o un array dan el mismo
  resultado.
- La app hoy no escribe doc vacío al crear: la columna es nullable y el
  insert simplemente la omite, queda `NULL`. Tanto el editor como el render
  definen por separado `EMPTY_DOC = {type: "doc", content: [{type:
  "paragraph"}]}` para ese caso.

**Consecuencia: el módulo `lib/tiptap/text-to-tiptap.ts` que este diseño
pedía ya no hace falta para el motivo original.** No hay corrupción que
evitar convirtiendo texto a Tiptap — un string se guarda y se lee bien tal
cual. Lo que sí hace falta es **validar la forma antes de escribir**: si el
valor no es `null` y no es string, tiene que ser `{type: "doc", content:
[...]}`; si no, la escritura se rechaza. Eso reemplaza al conversor en
`crear_tarea` y en `editar` (cuando `tipo: tarea`) cuando el campo
`description` viene en el payload — ver `tasks.md` Ola 7, tarea 7.1.

**Matiz que sí queda, registrado como decisión pendiente chica, no como
módulo (ver Open Questions):** como el string se interpreta como HTML, los
saltos de línea se colapsan y una descripción de varios párrafos escrita como
string queda en un solo párrafo. Si se quiere permitir varios párrafos, hace
falta partir el texto por saltos de línea antes de guardar — bastante menos
trabajo que un conversor completo, pero no se implementa en esta ola.

**3. Crear algo que necesite `position` — ver D-F, la base la completa.**

### D-F — `position`: la base la completa cuando no se la mandan (CONFIRMADO entero en la Ola 1)

Se verificó de forma empírica, no solo leyendo el esquema: insertar sin
`position` falla hoy en `tasks`, `projects` **y** `sections` con `null value
in column "position" violates not-null constraint` — las tres son `numeric
not null` sin default. Se confirmó también que un default de columna no
alcanza: "último hermano" depende del contexto de la fila (`project_id` +
`section_id`, o `parent_id` si está anidada), algo que un `DEFAULT` estático
de Postgres no puede ver. **`labels` y `filters` no tienen columna
`position`** — una tabla menos de la que preocuparse en todo lo que sigue.

**Fragilidad preexistente encontrada al verificar esto, no introducida por
`servidor-mcp`:** no hay constraint de unicidad sobre `position`, y ningún
`.order("position")` del código actual tiene criterio de desempate (ni `id`
ni `created_at`). Con dos filas empatadas, el orden queda a criterio del
planificador de Postgres. No hace falta arreglarlo para este cambio —
queda registrado acá como riesgo conocido y como candidato a abrirse como
deuda aparte, fuera de `servidor-mcp`.

`position numeric not null` existe en `tasks` y `projects` (`sections`
también la tiene, pero no está en el alcance de escritura del MCP, ver
Non-Goals). Hoy el valor se calcula en el navegador
(`lib/tasks/tree.ts:nextSiblingPositionInContext`,
`lib/projects/tree.ts:SIBLING_SPACING = 1000`) leyendo el caché de
TanStack Query: último hermano del mismo contexto (`project_id`,
`section_id`, `parent_id` para tareas; `parent_id` para proyectos) más 1000.
El MCP no tiene ese caché, y no debería necesitarlo para crear una tarea.

**Alternativas evaluadas:**

- **(A) El MCP replica el cálculo:** consulta los hermanos, calcula
  `max(position) + 1000`, inserta. Rechazada: duplica en TypeScript del
  servidor una lógica que ya vive en `lib/tasks/tree.ts` para el cliente, con
  el riesgo de que diverjan con el tiempo; y es dos viajes de red sin lock,
  así que dos inserciones concurrentes (dos pestañas y el MCP a la vez, o dos
  llamados del MCP) pueden calcular el mismo `max` y terminar con la misma
  posición — no rompe nada (no hay constraint de unicidad), pero el orden
  visual queda mal hasta el próximo rebalanceo.
- **(B) Column `default` con subconsulta:** rechazada de plano — un `DEFAULT`
  de columna en Postgres no puede referenciar otras columnas de la misma fila
  que se está insertando (`NEW.project_id`, etc.), así que no puede
  calcular "hermanos de esta fila" sin un trigger.
- **(C, elegida) `BEFORE INSERT` trigger que completa `position` cuando llega
  `NULL`.** `position` pasa a ser nullable en el esquema (deja de tener
  `not null` sin default) y una función de trigger, una por tabla o una
  genérica parametrizada, calcula `coalesce(max(hermanos.position), 0) +
  1000` con el mismo agrupamiento que ya usa el cliente, y la asigna antes
  del insert si `NEW.position is null`. El navegador **sigue mandando la
  suya** (no pierde el optimismo instantáneo de que la tarea aparezca en el
  lugar correcto antes de que vuelva la respuesta del servidor); el MCP la
  omite y confía en el trigger. `projects` ya tiene precedente de un trigger
  `BEFORE INSERT/UPDATE` para validar profundidad y ciclos
  (`20260726011602_projects.sql`) — este no es el primer trigger de
  comportamiento sobre esa tabla.

**Por qué (C) y no (A):** una sola fuente de verdad para "cómo se calcula la
posición por defecto", útil no solo para el MCP sino para cualquier inserción
futura que no pase por el hook de React (una migración de datos, una edge
function, otro cliente). El costo es un trigger más que mantener y un
`EXPLAIN` levemente distinto en cada insert — aceptable frente a duplicar la
lógica o dejarla sin resolver.

**Riesgo aceptado, no resuelto:** mover una tarea de proyecto o sección por
MCP (`editar` con `project_id`/`section_id` nuevos) no dispara el trigger
(es `BEFORE INSERT`, no `UPDATE`) ni recalcula `position` en el contexto
nuevo — la tarea se mueve con su posición numérica vieja, que puede quedar
fuera de rango de sus nuevos hermanos y verse en un lugar raro hasta que
alguien la reordene a mano. Es cosmético, del mismo orden que el costo
aceptado en D-C de `copiar-un-proyecto-como-markdown`, y queda anotado acá en
vez de resolverse con un trigger `BEFORE UPDATE` que agregaría alcance no
pedido.

### D-G — El conjunto de herramientas: nueve, no veinticinco

Los clientes MCP cargan la definición completa de cada herramienta en cada
pedido — más herramientas es más tokens de contexto en cada turno y peor
elección de herramienta por parte del modelo. Apoyándose en D-D (una sola
consulta cubre casi toda la lectura) y en un patrón de `tipo` discriminado
para la escritura de las entidades que no necesitan una firma propia, el
conjunto queda en nueve:

| Herramienta | Lee/Escribe | Qué hace |
| --- | --- | --- |
| `consultar_tareas` | Lee | Recibe `consulta` (texto en el lenguaje de filtros, `lib/query-language/`), la parsea a AST y llama al RPC `buscar_tareas`. Cubre Bandeja, Hoy, Próximos, Proyecto, Etiqueta, Filtro y Buscador. |
| `obtener_tarea` | Lee | Detalle completo de una tarea por id: todos sus campos, subtareas, etiquetas. Descripción convertida a texto (D-D). Sin comentarios ni recordatorios (Non-Goals). |
| `listar_estructura` | Lee | Árbol de proyectos con sus secciones, etiquetas y filtros guardados — el "mapa" de la cuenta, para que el modelo sepa qué proyectos/etiquetas/filtros existen antes de crear o filtrar. |
| `listar_habitos` | Lee | Hábitos con su estado del día (pendiente/hecho/salteado), racha actual, mejor racha, constancia y contador de repeticiones (mismos cálculos de lectura que `pantalla-habitos`, D62). |
| `crear_tarea` | Escribe | Recibe **lenguaje natural** (`texto`) y lo pasa por el mismo parser de `lib/parser/` que ya usa el alta rápida de la app, más contexto estructurado opcional (`project_id`, `section_id`, `parent_id`) para lo que el texto no exprese. `position` se omite siempre (D-F). La descripción, si viene, se valida en su forma antes de guardarse — un string se guarda tal cual, un objeto que no sea un doc válido se rechaza (D-E). Herramienta propia porque su firma —un string de lenguaje natural— es genuinamente distinta de la de las otras cuatro entidades. |
| `crear` | Escribe | `tipo` ∈ `proyecto, habito, etiqueta, filtro` + campos propios de cada tipo. `position` se omite siempre en `proyecto` (D-F). El `query` de un `filtro` se valida contra el parser antes de guardar. **Nunca acepta `tipo: tarea`** — para eso existe `crear_tarea`. |
| `editar` | Escribe | `tipo` ∈ `tarea, proyecto, habito, etiqueta, filtro` + `id` + campos a cambiar. **Nunca acepta `completed_at`** (existe `completar_tarea`) **ni `position`** — rechazados explícitamente por el validador del MCP, no solo omitidos. Consolidada para las cinco entidades, `tarea` incluida: a diferencia de crear, editar nunca recibe lenguaje natural — es siempre un parche de campos estructurados, con la misma forma sin importar el tipo, así que no tiene la asimetría de firma que justificó separar `crear_tarea`. |
| `completar_tarea` | Escribe | `id` + `completado: boolean`. Al completar una recurrente, crea la siguiente ocurrencia (D-E, caso 1). Al descompletar, ningún efecto lateral — igual que la app. |
| `archivar` | Escribe | `tipo` ∈ `proyecto, habito` + `id`. Es el único tipo de "baja" que el MCP ofrece — nunca borrar. |

**Por qué `tipo` discriminado y no una herramienta por entidad, para las
cuatro que quedan en `crear`/las cinco de `editar`:** separar create/edit
para proyecto, hábito, etiqueta y filtro serían ocho herramientas solo para
esa escritura. Un discriminador `tipo` con un `properties` distinto por tipo
(documentado en el `description` de la herramienta, que es donde el modelo
lee qué campos acepta cada una) es el mismo patrón que ya usan varios
servidores MCP de terceros para este problema exacto, y deja lugar para una
sexta entidad el día de mañana sin sumar una herramienta nueva.

**Por qué `crear_tarea` se separa y `editar` no (decisión del dueño):** crear
una tarea es, de lejos, el uso más frecuente del MCP, y es la única
operación de escritura que recibe lenguaje natural en vez de campos
estructurados — su firma (`texto: string` que se interpreta con
`lib/parser/`) es distinta en naturaleza a la de crear un proyecto, un
hábito, una etiqueta o un filtro (todos campos estructurados desde el
principio). Esconder esa asimetría adentro de un `tipo` discriminado
obligaría a que el modelo entienda que `crear` con `tipo: tarea` tiene un
`properties` completamente distinto al de los otros cuatro tipos — más
confuso que separarla. Editar, en cambio, **nunca** recibe lenguaje natural
para ningún tipo: es siempre un parche de campos ya estructurados, con la
misma forma para las cinco entidades. No hay asimetría de firma que separar,
así que `editar` se queda consolidada.

**Nombres en español, con precedente directo en el repo.** Los
identificadores de las nueve herramientas —no solo sus descripciones— van en
español: `crear_tarea`, `crear`, `editar`, `completar_tarea`, `archivar`,
`consultar_tareas`, `obtener_tarea`, `listar_estructura`, `listar_habitos`.
Es una revisión de la decisión original de este diseño (que proponía inglés
por convención del ecosistema de function-calling) — el dueño la resolvió
con dos argumentos que pesan más que esa convención:

- **Hay precedente directo en el propio esquema:** los RPC de Postgres que
  el MCP consume ya se llaman `buscar_tareas`
  (`supabase/migrations/20260729130000_buscar_tareas.sql`) y
  `calcular_racha_habito`
  (`supabase/migrations/20260729180000_calcular_racha_habito.sql`). Una
  herramienta MCP en inglés hubiera sido la primera superficie con nombres
  en otro idioma en un repo donde hasta la base de datos habla español.
- **El vocabulario del dominio ya está fijado en español** por
  `.claude/rules/copy.md` (proyecto, sección, subtarea, Bandeja de entrada,
  hábito, filtro) y por D4 (español únicamente, sin intención de salir del
  mercado hispanohablante). Una herramienta `search_tasks` cuya
  `description` habla de la Bandeja de entrada quedaba incoherente —dos
  idiomas mezclados en la misma superficie que el modelo lee para decidir
  qué invocar— y la convención del ecosistema MCP no compra nada frente a
  eso: Trazio nunca va a tener un cliente MCP en un contexto anglófono.

**Colisión con el RPC `buscar_tareas`, resuelta con un nombre distinto, no
con el mismo.** La herramienta de lectura de tareas se llama
`consultar_tareas`, no `buscar_tareas` como el RPC que envuelve, aunque las
dos hagan, en esencia, lo mismo. Se evaluó reusar el mismo nombre —
argumento a favor: señalaría que son la misma operación en dos capas— y se
descartó: `consultar_tareas` (herramienta MCP, en `app/api/mcp/`) no es un
wrapper puro de `buscar_tareas` (RPC, en `supabase/migrations/`) — además de
llamarlo, parsea el lenguaje de consulta a AST antes (D-D) y convierte cada
`description` de jsonb de Tiptap a texto después (D-D) — así que ya son dos
cosas distintas con una relación de "una llama a la otra", no de alias. Con
el mismo nombre, un grep de `buscar_tareas` en el repo mezclaría sin
distinción una función SQL y un handler de TypeScript que no son
intercambiables, y un stack trace o un log de error no alcanzaría a decir
solo, por el nombre, en qué capa ocurrió el problema. `consultar_tareas` usa
"consultar", el mismo verbo que ya nombra "el lenguaje de consulta" en
`docs/product-spec.md` §7 y en la capacidad `lenguaje-de-consulta` — sigue
siendo vocabulario del dominio, sin inventar un término nuevo, pero deja
inequívoco cuál de las dos capas es cuál con solo leer el nombre.

### D-H — Regla que fija dónde va español y dónde va inglés en toda la superficie

Traducir el nombre de las nueve herramientas y no traducir nada más habría
dejado una línea arbitraria: ¿por qué `crear` sí y `id` no? La regla que
sostiene, de forma pareja, cada identificador de este diseño:

> **Vocabulario de producto en español; modelo de datos en inglés.** El
> nombre de una herramienta, los valores del discriminador `tipo` (`tarea`,
> `proyecto`, `habito`, `etiqueta`, `filtro`) y los parámetros que
> inventamos nosotros (`completado`, `texto`, `consulta`) van en español,
> porque son vocabulario del producto y están fijados por
> `.claude/rules/copy.md`. Los parámetros que corresponden uno a uno con
> una columna de la base (`id`, `project_id`, `section_id`, `parent_id`,
> `due_date`, `position`, `description`, `query` de un filtro —
> `filters.query`) van en inglés, con el nombre exacto de la columna,
> porque son el modelo de datos y renombrarlos solo agregaría una capa de
> traducción que hay que mantener y que puede desincronizarse.

El propio discriminador `tipo` es un caso de la primera mitad de la regla,
no una excepción a mano: ninguna tabla tiene una columna `type`/`tipo` — es
un parámetro que el MCP inventa para elegir entre entidades, así que cae del
lado del vocabulario de producto igual que `completado` o `texto`. Se
corrigió acá mismo, en esta revisión: el diseño anterior lo dejaba en inglés
(`type`) por inercia de haber nacido como identificador de herramienta en
inglés, sin que nadie aplicara la regla explícita porque todavía no existía
escrita. Con la regla puesta por escrito, es una violación clara y se
corrige, no un matiz a discutir.

El mismo criterio agrega un nombre explícito al parámetro de
`consultar_tareas` que hasta acá solo se describía en prosa: se llama
`consulta` (no `query`), porque ese texto de entrada no persiste en ninguna
columna — se parsea a AST y se descarta. Es distinto del `query` que
`crear`/`editar` aceptan para `tipo: filtro`, que sí corresponde uno a uno
con la columna `filters.query` y por eso se queda en inglés: dos parámetros
de forma parecida (ambos "un texto en el lenguaje de consulta"), con destino
distinto (uno se guarda, el otro no), y por eso con nombre distinto — la
regla explica la diferencia en vez de esconderla.

### D-I — Transporte: HTTP dentro de Next.js, en `app/api/mcp/` (CONFIRMADO en la Ola 1)

MCP corre como un route handler más de Next.js, autenticado por el
`Authorization: Bearer` que trae el access token del OAuth server —
consistente con "Route Handlers" ya listado en `AGENTS.md`. Es el camino que
la propia Vercel documenta.

**Validado en la Ola 1:** el paquete correcto es **`mcp-handler` v2** (repo
`vercel/mcp-handler`) — no `@vercel/mcp-adapter`, que es el nombre viejo y
cuyo README redirige al nuevo. Pide `zod ^4.2`, Node ≥20, `next ≥13`; el repo
tiene zod 4.4.3, Node 24, Next 16 — compatible. **La versión 2 es sin
sesiones y no necesita Redis**: el transporte es streamable HTTP y la spec
nueva es stateless. Esto elimina la preocupación original de "función sin
estado sirviendo un protocolo con sesiones" — no hacía falta resolverla,
porque el protocolo mismo ya no la tiene.

**Trampa documentada:** la doc de Vercel muestra la API 1.x (`server.tool`,
opción `basePath`) y el README del repo la 2.x (`server.registerTool` con
`inputSchema`, sin `basePath`). Copiar el snippet de la documentación oficial
con la v2 instalada no compila.

**Límite que condiciona el diseño de las herramientas de lectura, no una
optimización futura: 4,5 MB de cuerpo de respuesta en Vercel.** Una
herramienta que liste todo sin paginar se pasa con una cuenta grande. Por eso
`consultar_tareas`, `listar_estructura` y `listar_habitos` **SHALL paginar**
(`tasks.md` Ola 6, tarea 6.2) — es requisito de este diseño, no algo a
resolver "si hace falta".

**Otros hallazgos:** Deployment Protection bloquea el endpoint en previews —
hay que probar en producción o con un bypass. Claude tiene timeouts propios
en el flujo de conexión: 10 s para descubrimiento, registro y token; 30 s
para refresh.

### D-J — Riesgos de cumplimiento del protocolo OAuth/MCP, registrados sin resolver (hallazgo de la Ola 1)

Tres cosas incómodas que la Ola 1 encontró y que este diseño no resuelve —
se documentan como riesgo abierto, con las alternativas evaluadas, no se
elige una acá.

**Validación de audiencia (RFC 8707).** La spec de MCP dice que el servidor
**MUST** validar que el token fue emitido para él. El JWT de Supabase trae
`aud: "authenticated"`, no la URI de nuestro servidor MCP, y el proyecto no
anuncia soporte de RFC 8707. No hay forma limpia de cumplir la letra de la
spec. Dos salidas evaluadas, ninguna elegida:

- Un hook que reescriba el claim de audiencia — complicado porque con
  registro dinámico cada conexión trae un `client_id` distinto, no hay un
  único valor de audiencia esperado para reescribir contra.
- Validar emisor (`iss`) más presencia de `client_id`, que cumple el
  espíritu de la validación sin cumplir la letra exacta de RFC 8707.

**Registro dinámico de clientes, deprecado en la spec de MCP (julio 2026).**
La spec de MCP reemplazó el registro dinámico por Client ID Metadata
Documents (CIMD). Supabase no anuncia soporte de CIMD, así que un cliente
como Claude cae a registro dinámico: funciona, pero registra un cliente
nuevo en cada conexión fresca y los clientes registrados se acumulan sin
límite. Mitigación posible, no implementada: monitorear la cantidad de
clientes registrados.

**Claves de firma asimétricas, potencialmente obligatorias.** La
documentación de Supabase recomienda claves asimétricas para OAuth y las
vuelve **obligatorias** si se piden ID tokens con el scope `openid`. Cambiar
las claves de firma de un proyecto con usuarios reales no es un cambio
trivial. El diseño actual pide el scope `openid email` (ver D-A); queda
abierto si conviene pedir solo `email` para no depender de esa condición —
no se resuelve acá, ver Open Questions.

## Open Questions

- **`description` con formato rico perdido al escribir por MCP:** como
  Tiptap interpreta un string como HTML (D-E, caso 2, corregido en la Ola 1),
  los saltos de línea de una descripción en texto plano se colapsan en un
  solo párrafo. Partir el texto por saltos de línea antes de guardar
  resolvería el caso más común — mucho menos trabajo que el conversor
  completo que este diseño pedía originalmente — pero es una decisión
  pendiente chica, no tomada en esta ola. Si en el uso real los modelos
  tienden a escribir markdown en la descripción (probable, es su formato de
  salida por defecto), la pérdida de formato rico (negrita, links, listas) va
  a sentirse como una limitación real más allá de los saltos de línea. Queda
  abierto si conviene, en una ola posterior, interpretar markdown básico —
  no se resuelve en este diseño para no ampliar el alcance antes de ver el
  problema real.
- **¿Pedir solo `email` en vez de `openid email`?** (D-J) — para no depender
  de que el proyecto tenga o adopte claves de firma asimétricas. No se
  resolvió en esta ola.
- **Si Supabase honra el parámetro `resource` de RFC 8707** — no probado.
- **Si Supabase piensa soportar CIMD** — no hay anuncio público conocido.
- **Qué pasa con clientes registrados y tokens vivos al desactivar el
  servidor OAuth** — no probado.
- **Si Supabase hace match ignorando el puerto en redirect URIs de
  loopback** — requisito para que Claude Code pueda conectar como cliente
  local; no probado.
- **Fecha de disponibilidad general (GA) del servidor OAuth** — es lo que
  destrabaría que `config push` lo sincronice como cualquier otra sección de
  `config.toml` (D-A); no hay fecha conocida.

## Risks / Trade-offs

**[El servidor OAuth de Supabase está en beta]** → D-A: el contrato puede
cambiar; sin mitigación posible desde acá más que registrarlo y revisarlo si
Supabase anuncia un cambio.

**[El token puede hacer cualquier cosa que puede hacer el usuario, salvo
borrar]** → D-C (corregida en la Ola 1): el límite estructural del servidor
OAuth (no hay scope de solo lectura) sigue en pie para lectura/escritura,
pero **borrar deja de estar entre esas cosas** una vez que las políticas de
RLS de `tasks.md` Ola 4 estén escritas y probadas con `pnpm test:rls`. Hasta
que esa ola se implemente, el riesgo sigue siendo el de la versión anterior
de esta decisión. D63 y la política de privacidad todavía dicen la versión
sin acotar y hay que ajustarlos — ver nota al final de D-C.

**[Mover una tarea de proyecto/sección por MCP no recalcula `position`]** →
D-F: cosmético, aceptado, mismo criterio que D-C de
`copiar-un-proyecto-como-markdown`.

**[Formato rico perdido al escribir la descripción con markdown desde el
modelo]** → Open Questions: sin resolver en esta ola, a evaluar con uso real.

**[Validación de audiencia (RFC 8707) no cumplible a la letra, registro
dinámico deprecado por la spec de MCP y sin alternativa de Supabase, claves
de firma asimétricas potencialmente obligatorias]** → D-J: tres riesgos de
cumplimiento del protocolo, registrados en la Ola 1, sin resolver acá.

**[No hay constraint de unicidad ni criterio de desempate en `position`]** →
D-F: fragilidad preexistente encontrada al validar el invariante de
`position`, no introducida por este cambio; candidata a deuda aparte.
