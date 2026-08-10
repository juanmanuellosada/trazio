## 0. Gobernanza

- [x] 0.1 Anotar D63 en `docs/decisions.md`: se acota D3 otra vez — un servidor MCP habilitado, revocable, acotado por RLS y sin borrado expuesto no es exportar.
- [x] 0.2 Actualizar `docs/product-spec.md`: nueva subsección "Acceso por un asistente de IA (MCP)" en §5, bullet "Aplicaciones conectadas" en §11, acotamiento de D63 en §13 punto 2.
- [x] 0.3 Actualizar `app/(marketing)/privacidad/page.tsx`: nueva fila en la tabla de terceros y nueva sección "Cómo funciona conectar un asistente de IA", con la limitación del token dicha sin matices.
- [x] 0.4 Esta propuesta de OpenSpec (`proposal.md`, `design.md`, `tasks.md`, spec deltas de `mcp`, `consentimiento-oauth`, `esquema-datos`, `configuracion`).

## 1. Cerrar las suposiciones abiertas, antes de construir encima — OLA COMPLETADA (2026-08-10)

Los cuatro puntos se probaron de forma empírica. Varios resultados **corrigen**
suposiciones que este documento daba por buenas — el detalle de cada
corrección vive en `design.md` (D-B, D-C, D-E caso 2, D-F, D-I). Acá quedan
los resultados crudos.

- [x] 1.1 **Transporte en Vercel (D-I). Resultado: confirmado, camino documentado.**
      Es el camino que la propia Vercel documenta: un route handler en
      `app/api/mcp/route.ts`, sin despliegue aparte. El paquete correcto es
      `mcp-handler` v2 (repo `vercel/mcp-handler`) — **no** `@vercel/mcp-adapter`
      (nombre viejo, su README redirige al nuevo). Pide `zod ^4.2`, Node ≥20,
      `next ≥13`; el repo tiene zod 4.4.3, Node 24, Next 16 — compatible. La
      versión 2 es **sin sesiones y no necesita Redis** (transporte streamable
      HTTP, spec stateless), lo que elimina la preocupación original de "función
      sin estado sirviendo un protocolo con sesiones". Trampa documentada: la
      doc de Vercel muestra la API 1.x (`server.tool`, opción `basePath`), el
      README del repo muestra la 2.x (`server.registerTool` con `inputSchema`,
      sin `basePath`) — copiar el snippet de la doc con la v2 instalada no
      compila. **Límite duro que condiciona el diseño: 4,5 MB de cuerpo de
      respuesta en Vercel** — pasa a ser requisito de paginación en la Ola 6, no
      mejora futura. Otros hallazgos: Deployment Protection bloquea el endpoint
      en previews (probar en producción o con bypass); Claude tiene timeouts
      propios (10 s descubrimiento/registro/token, 30 s refresh).
- [x] 1.2 **Invariante de Tiptap (D-E caso 2, deducido). Resultado: hipótesis PARCIALMENTE FALSA.**
      Se probó insertando valores corruptos en `tasks.description` y renderizando
      con `ReadOnlyDescription` y el editor. Un **string plano no corrompe
      nada**: Tiptap trata un `content` string como HTML, lo parsea y produce
      `<p>texto</p>` sin excepción ni warning; con `<script>alert(1)</script>hola`
      el script se descarta porque no está en el schema — no hay vía de XSS. El
      riesgo real es **un objeto que no sea un doc válido** (p. ej. `{text:
      "..."}`, lo que un modelo inventaría sin ver el schema): ahí Tiptap no
      lanza excepción, la atrapa internamente, escribe un `console.warn` que
      nadie ve en producción, y renderiza vacío — **pérdida silenciosa del
      contenido anterior**. Un número o un array dan el mismo resultado. La app
      hoy no escribe doc vacío al crear (columna nullable, el insert la omite,
      queda `NULL`; editor y render definen por separado `EMPTY_DOC = {type:
      "doc", content: [{type: "paragraph"}]}` para ese caso). Consecuencia: el
      módulo `lib/tiptap/text-to-tiptap.ts` que este diseño pedía **no hace
      falta** para el motivo original — ver D-E caso 2 corregido en `design.md`
      y la Ola 7 reescrita.
- [x] 1.3 **Invariante de `position` (D-F, deducido). Resultado: CONFIRMADO entero.**
      Insertar sin `position` falla en `tasks`, `projects` y `sections` con
      `null value in column "position" violates not-null constraint` — las tres
      son `numeric not null` sin default. Un default de columna no alcanza,
      verificado: "último hermano" depende del contexto de la fila
      (`project_id`+`section_id` o `parent_id`), que un `DEFAULT` estático no
      puede ver. **`labels` y `filters` no tienen columna `position`** — una
      tabla menos de la que preocuparse. **Fragilidad preexistente encontrada,
      no introducida por este cambio:** no hay constraint de unicidad sobre
      `position`, y ningún `.order("position")` del código actual tiene
      criterio de desempate (ni `id` ni `created_at`) — con dos filas empatadas
      el orden queda a criterio del planificador. Registrado como riesgo
      conocido en `design.md` (D-F), con sugerencia de abrirlo como deuda
      aparte; no se arregla en este cambio.
- [x] 1.4 **Habilitar `[auth.oauth_server]` en el proyecto hospedado. Resultado: `supabase config push` NO sincroniza el servidor OAuth.**
      En el código del CLI, las funciones que harían ese trabajo son cuerpos
      vacíos con `// TODO(cemal) :: implement me` — la función está en beta.
      Poner `enabled = true` en `config.toml` no hace nada en producción, y
      `supabase link` tampoco reporta la deriva: inconsistencia silenciosa. La
      Management API sí expone los campos: `PATCH
      /v1/projects/{ref}/config/auth` con `oauth_server_enabled`,
      `oauth_server_allow_dynamic_registration` y
      `oauth_server_authorization_path`. Test binario de si quedó prendido:
      `GET https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1`
      devuelve 404 con `feature_disabled` cuando está apagado. En el hospedado
      la ruta de consentimiento sale de **Site URL + Authorization Path** y,
      por un PR sin mergear en el proveedor, **tiene que vivir en el mismo
      origen que el Site URL** — para Trazio está bien, queda anotado. Esto
      reemplaza cualquier tarea de "habilitar por `config.toml`" o "por el
      panel" en la Ola 3: el camino reproducible es un script versionado en el
      repo que haga el `PATCH`.

## 2. Esquema: `position` por defecto — OLA COMPLETADA (2026-08-10)

- [x] 2.1 Migración: `tasks.position`, `projects.position` y `sections.position` **siguen `not null`, sin cambio de esquema.**
      Corrige el texto original de esta tarea (que pedía volverla nullable):
      se verificó de forma empírica, no solo leída, que un trigger `BEFORE
      INSERT` a nivel de fila corre antes de que Postgres chequee la
      restricción `NOT NULL` (prueba con una tabla descartable, `psql` dentro
      del contenedor `supabase_db_trazio`) — así que la columna se queda
      `not null` y la garantía se mantiene para cualquier otro camino de
      inserción. Migración:
      `supabase/migrations/20260810000000_position_default_trigger.sql`.
      Se agregó `sections` también (no estaba en el texto original de esta
      tarea, pero D-F la incluye explícitamente entre las tres tablas
      afectadas y el pedido de la ola la pide).
- [x] 2.2 Tres funciones de trigger `BEFORE INSERT` (una por tabla, no una
      genérica parametrizada), que solo actúan cuando `NEW.position is
      null`: `tasks` agrupa por `user_id, project_id, parent_id` cuando
      `parent_id` no es nulo, o por `user_id, project_id, section_id` (`is
      not distinct from`) cuando es de primer nivel — replica exactamente
      `siblingsOfTask` de `lib/tasks/tree.ts`; `projects` agrupa por
      `user_id, parent_id` (`is not distinct from`), como `siblingsOf` de
      `lib/projects/tree.ts`; `sections` agrupa por `user_id, project_id`.
      Mismo espaciado (1000) que `SIBLING_SPACING`, con comentario cruzado en
      ambos lados. Concurrencia: cada función toma un
      `pg_advisory_xact_lock` con clave = tabla + contexto de hermanos antes
      de leer `max(position)`, para que dos inserciones sin `position` en el
      mismo contexto no calculen el mismo valor — justificación completa en
      el comentario de cabecera de la migración. `SECURITY INVOKER` (no
      definer): la RLS ya acota por `user_id`, y el filtro explícito por
      `user_id` adentro es la misma segunda línea de defensa que ya usan las
      funciones de rebalanceo.
- [x] 2.3 Tests SQL: `supabase/tests/position-default.test.ts` — insert sin
      `position` con hermanos y sin hermanos, dos contextos que no se pisan
      (dos secciones del mismo proyecto, subtarea anidada vs. tarea de
      primer nivel, dos proyectos distintos), e insert que manda `position`
      explícita y se respeta tal cual — para las tres tablas, no solo
      `tasks` y `projects` como decía el texto original.
- [x] 2.4 `pnpm db:types:local` (local, no `pnpm db:types`: esta ola no toca
      el proyecto hospedado). Sin diff en `lib/supabase/database.types.ts`:
      no cambió ninguna columna nullable ni de tipo, coherente con 2.1.

**Nota de la Ola 1 (1.3):** no hay constraint de unicidad sobre `position` ni
criterio de desempate en los `.order("position")` existentes. No es alcance
de esta migración arreglarlo (ver D-F, riesgo aceptado) — se anota acá para
que quede visible al lado del trigger que sí se construye, y como candidato a
abrirse como deuda aparte, fuera de `servidor-mcp`.

## 3. Servidor OAuth y registro de clientes

- [x] 3.1 `[auth.oauth_server] enabled = true` y `allow_dynamic_registration = true` en `supabase/config.toml` (stack local). Para el proyecto hospedado, **escribir un script versionado en el repo** que haga `PATCH /v1/projects/{ref}/config/auth` con `oauth_server_enabled: true`, `oauth_server_allow_dynamic_registration: true` y `oauth_server_authorization_path` apuntando a `/oauth/consent` (resultado de 1.4 — no se habilita por `config.toml` ni por el panel).
      **Resultado (2026-08-10):** `supabase/config.toml` actualizado (local, ya
      verificado de punta a punta más abajo). Script en
      `scripts/enable-oauth-server.mjs`: token de la Management API por
      `SUPABASE_ACCESS_TOKEN`, ref del proyecto por `SUPABASE_PROJECT_REF` o
      `--project-ref`, ninguno hardcodeado. Solo lectura por defecto (compara
      estado actual vs. deseado sin escribir), requiere `--apply` explícito
      para el `PATCH`, idempotente (si ya está en el estado deseado no manda
      ningún `PATCH`), verifica el resultado contra el endpoint público de
      metadata después de aplicar, y falla claro (exit 1, sin tocar la red)
      si falta el token o el ref. Advierte si el Site URL del proyecto no
      coincide con `www.trazio.com.ar` (requisito de mismo origen de D-A).
      Procedimiento documentado en `docs/setup-mcp-oauth-server.md` (registrado
      en la tabla de documentación de `AGENTS.md`).
- [ ] 3.2 Correr el script de 3.1 contra el proyecto hospedado y confirmar con el test binario de 1.4 (`GET .well-known/oauth-authorization-server/auth/v1` ya no devuelve `feature_disabled`).
      **Sin hacer a propósito:** requiere un token de la Management API que
      el agente no tiene y que no debe generarse por cuenta propia — habilitar
      una función en beta sobre la instancia de producción del dueño es su
      decisión. Queda pendiente de que el dueño corra
      `docs/setup-mcp-oauth-server.md` cuando decida.
- [ ] 3.3 Probar el registro dinámico de un cliente de prueba contra el proyecto hospedado (no solo local), confirmando que devuelve `client_id` sin secreto.
      **Parcial:** verificado contra el stack **local** (`POST
      /auth/v1/oauth/clients/register` devuelve 201 con `client_id`,
      `client_type: "public"`, sin secreto). Contra el proyecto hospedado
      queda pendiente de 3.2, mismo motivo.

*(Se elimina la tarea de actualizar `@supabase/supabase-js`: la Ola 1 confirmó
que la versión instalada ya expone `auth.oauth.getAuthorizationDetails`,
`approveAuthorization`, `denyAuthorization`, `listGrants` y `revokeGrant` — el
error original vino de buscar en `node_modules/@supabase/auth-js`, ruta que
con pnpm no existe. Ver D-B corregida en `design.md`.)*

## 4. Políticas de RLS que discriminan acceso OAuth — OLA COMPLETADA (2026-08-10)

La Ola 1 corrigió una afirmación de este diseño: "el MCP no borra" **no** es
solo una propiedad de la superficie de herramientas — se puede enforcear en
la base. Un token OAuth trae un claim `client_id`; una sesión normal de la
app, no. Es el mecanismo que la propia documentación de Supabase recomienda
para discriminar acceso OAuth. Este bloque depende de la Ola 3 (necesita el
servidor OAuth habilitado para que `client_id` exista en los tokens de
prueba). Tratar con el mismo cuidado que el commit `b2d78b8` ("ocho funciones
eran ejecutables por roles que no debían") — revisar cada política
modificada de forma individual, no en bloque.

- [x] 4.1 **Resultado:** diecinueve tablas con política de `DELETE`, todas
      `(select auth.uid()) = user_id` (o `= id` en `profiles`) — ver
      `supabase/migrations/20260810010000_oauth_client_delete_restrictions.sql`
      para la lista completa con el porqué de cada una. Dieciocho se
      bloquean para OAuth; **`task_labels` queda sin tocar a propósito**:
      es la tabla puente tarea↔etiqueta, y quitarle una etiqueta a una
      tarea (`useReplaceTaskLabels`, `lib/tasks/mutations.ts`: borra todas
      las filas de `task_labels` de la tarea e inserta las nuevas) es, para
      el usuario, editar la tarea — `editar` sí es una herramienta del MCP.
      Bloquearla habría roto esa capacidad.
- [x] 4.2 **Resultado:** `supabase/migrations/20260810010000_oauth_client_delete_restrictions.sql`,
      con `alter policy` sobre cada política ya existente (no
      `drop`/`create`): mismo nombre, misma condición de siempre, se le
      agrega `and (select auth.jwt() ->> 'client_id') is null`. El claim
      se verificó de forma empírica contra el stack local antes de escribir
      la migración (no solo leído en la documentación de Supabase): un
      login por contraseña no lo trae, el mismo usuario completando el
      flujo OAuth 2.1 + PKCE sí, con valor igual al id del cliente OAuth
      registrado. También se verificó de forma empírica —tabla descartable
      en el stack local— que un borrado en cascada (`on delete cascade`) no
      pasa por la política de RLS de la tabla hija: una hija con
      `using (false)` igual pierde sus filas cuando se borra el padre. Por
      eso alcanza con bloquear la tabla padre; no hizo falta blindar por
      esta vía ninguna tabla que cuelgue de un `on delete cascade`.
- [x] 4.3 **Resultado:** `supabase/tests/oauth-delete-restrictions.test.ts`
      (21 tests) + `supabase/tests/oauth.ts` (helper: registro dinámico de
      cliente + `/oauth/authorize` con PKCE + consentimiento + canje de
      código, para conseguir un access token OAuth real de prueba —
      requiere un `GET` a `/oauth/authorizations/:id` antes del `POST` de
      consentimiento, verificado a mano: sin ese paso el consentimiento
      devuelve 404 `authorization_not_found` aunque el `authorization_id`
      sea el correcto). Cubre, para las 18 tablas bloqueadas: el token
      OAuth no borra (0 filas, sin error explícito — así responde
      PostgREST cuando RLS filtra la fila antes de la sentencia) y la
      sesión de la app sí borra la misma fila; para `task_labels`, que el
      token OAuth sí puede borrar; y que SELECT/INSERT/UPDATE con el token
      OAuth siguen funcionando sin cambios. `pnpm test:rls` en verde (21
      archivos, 154 tests) y el resto del gate
      (`pnpm lint && pnpm typecheck && pnpm test`) también.
- [x] 4.4 **Resultado:** la implementación coincide con lo que D-C ya
      describía — no hizo falta corregir nada en `design.md`. El único
      hallazgo nuevo respecto al texto existente es el del cascade (ver
      4.2), que ya estaba anotado como pendiente de verificar en el
      encabezado de esta ola y ahora queda confirmado en el comentario de
      cabecera de la migración.

## 5. Pantalla de consentimiento y aplicaciones conectadas

- [ ] 5.1 Ruta `/oauth/consent`: leer `authorization_id` de la query, pedir detalles con `getAuthorizationDetails`, mostrar qué aplicación pide acceso. Confirmar que el Site URL del proyecto y el path de autorización comparten origen (requisito del servidor OAuth hospedado, ver 1.4).
- [ ] 5.2 Advertencia visible de la limitación del acceso (spec `consentimiento-oauth`, requirement "La pantalla de consentimiento advierte la limitación del acceso") — mismo criterio de "que se lea, no que esté" que ya usa el enlace de lectura de un proyecto.
- [ ] 5.3 Aprobar (`approveAuthorization`) y rechazar (`denyAuthorization`), con sus estados de carga y error.
- [ ] 5.4 Estado para `authorization_id` inválido o vencido, sin revelar más de lo necesario.
- [ ] 5.5 Definir el tratamiento visual con la skill `ui-ux-pro-max` antes de escribir el CSS (regla del proyecto para pantallas nuevas).
- [ ] 5.6 Sección "Aplicaciones conectadas" en Configuración: listar con `listGrants`, revocar con `revokeGrant`, estado vacío cuando no hay ninguna.
- [ ] 5.7 Tests de componente para consentimiento y aplicaciones conectadas.

## 6. Servidor MCP: lectura

- [ ] 6.1 `app/api/mcp/`: esqueleto del servidor MCP con `mcp-handler` v2 (no `@vercel/mcp-adapter`; API `server.registerTool` con `inputSchema`, ver trampa de 1.1), autenticado por el `Authorization: Bearer` del access token OAuth, sin `service_role` en ningún punto.
- [ ] 6.2 **Paginación de las herramientas de lectura que devuelven colecciones (`consultar_tareas`, `listar_estructura`, `listar_habitos`): requisito de diseño, no mejora futura (límite de 4,5 MB de cuerpo de respuesta en Vercel, confirmado en 1.1).** Definir el mecanismo de paginación (cursor u offset+límite) antes de implementar cada herramienta.
- [ ] 6.3 `consultar_tareas`: reutiliza `lib/query-language/parse.ts` para convertir la consulta a AST, llama al RPC `buscar_tareas(ast, at)` de forma paginada (6.2), convierte cada `description` con `lib/markdown/tiptap-to-markdown.ts`. Nombre distinto al del RPC a propósito (D-G de `design.md`): no son la misma capa.
- [ ] 6.4 `obtener_tarea`: consulta directa por id (tarea, subtareas, etiquetas), sin comentarios ni recordatorios, descripción convertida.
- [ ] 6.5 `listar_estructura`: proyectos en árbol con secciones, etiquetas, filtros guardados, paginado (6.2) si la cuenta tiene un árbol grande.
- [ ] 6.6 `listar_habitos`: hábitos con estado del día, racha, constancia y repeticiones (mismos cálculos que `pantalla-habitos`), paginado (6.2) si hace falta.
- [ ] 6.7 Tests de cada herramienta de lectura, incluidos los casos de aislamiento por RLS (una cuenta no ve datos de otra a través del MCP) y de paginación (una colección que excede una página).

## 7. Servidor MCP: escritura protegida

- [ ] 7.1 **Validador de forma para `description` antes de escribir** (reemplaza el conversor `lib/tiptap/text-to-tiptap.ts` que este diseño pedía originalmente — ver D-E caso 2 corregido en `design.md`, hallazgo de la Ola 1): si `description` no es `null` y no es un string, debe cumplir la forma `{type: "doc", content: [...]}` o la escritura se rechaza. Cuando llega como string, se guarda tal cual — Tiptap la interpreta como HTML al leer, sin conversión previa. Test para el caso de rechazo (objeto que no es un doc válido) y el caso de string aceptado tal cual.
- [ ] 7.2 `crear_tarea`: recibe `texto` en lenguaje natural y lo pasa por el parser de `lib/parser/` (mismo camino que `lib/parser/create-task-from-parse.ts` usa para el alta rápida de la app), con `project_id`/`section_id`/`parent_id` opcionales como contexto estructurado. `position` siempre omitida (D-F). `description`, si viene, pasa por el validador de 7.1 — un string se guarda tal cual, no se convierte. Herramienta propia, no pasa por el discriminador `tipo` de 7.3 (D-G).
- [ ] 7.3 `crear`: discriminador `tipo` (`proyecto`, `habito`, `etiqueta`, `filtro` — nunca `tarea`, que tiene su propia herramienta en 7.2), `position` siempre omitida en `proyecto`, `query` de un `filtro` validada con el parser antes de guardar.
- [ ] 7.4 `editar`: discriminador `tipo` (`tarea`, `proyecto`, `habito`, `etiqueta`, `filtro`) + `id`, valida explícitamente que el payload NUNCA incluya `completed_at` ni `position` — rechazo explícito, no solo omisión silenciosa. Cuando `tipo: tarea` y viene `description`, pasa por el validador de 7.1 (mismo criterio que 7.2).
- [ ] 7.5 `completar_tarea`: `UPDATE tasks SET completed_at` directo, y si `completado: true` sobre una tarea recurrente, llama a `createNextRecurringOccurrence` (`lib/recurrence/create-next-occurrence.ts`) reutilizada tal cual con el cliente autenticado del usuario.
- [ ] 7.6 `archivar`: discriminador `tipo` (`proyecto`, `habito`) únicamente.
- [ ] 7.7 Tests de cada herramienta de escritura: los casos de rechazo (`completed_at`/`position` en `editar`, `tipo: tarea` en `crear`, `tipo: seccion` en `crear`/`editar`), el caso de recurrencia, y el caso de filtro inválido.

**Decisión pendiente chica, no resuelta en esta ola (Ola 1, hallazgo sobre
Tiptap):** como Tiptap interpreta un string como HTML, los saltos de línea de
una descripción de varios párrafos escrita en texto plano se colapsan en un
solo párrafo. Partir el texto por saltos de línea antes de guardar (mucho
menos trabajo que un conversor completo) resolvería esto, pero queda como
decisión abierta — ver Open Questions de `design.md` — no como tarea de esta
ola.

## 8. Cierre

- [ ] 8.0 **BLOQUEANTE — no publicar la política de privacidad antes de la migración.** El texto de
      `app/(marketing)/privacidad/page.tsx` sobre "Trazio bloquea el borrado a nivel de base de datos"
      afirma algo que hoy **no es cierto**: la política de RLS que lo hace real es la de la Ola 4 (4.2),
      todavía no aplicada. Ese texto no se publica (no se mergea a producción) hasta que la migración de
      la Ola 4 esté aplicada en producción y verificada con un `DELETE` real rechazado (mismo criterio
      que 8.3). Es la misma clase de trampa que ya tuvimos con el subtítulo de la landing prometiendo una
      función que no existía — no repetirla acá.
- [ ] 8.1 `pnpm lint && pnpm typecheck && pnpm test && pnpm test:rls` en verde (se agrega `test:rls` por la Ola 4).
- [ ] 8.2 Verificar en el navegador: aprobar una conexión real desde `/oauth/consent`, ver la aplicación listada en "Aplicaciones conectadas", revocarla y confirmar que el token dejó de servir.
- [ ] 8.3 Verificar con un cliente MCP real (Claude u otro compatible) conectado al deploy: ejecutar cada una de las nueve herramientas al menos una vez, incluida completar una tarea recurrente y confirmar que crea la siguiente ocurrencia. Además, con el access token obtenido, intentar un `DELETE` directo contra PostgREST (fuera de las herramientas del MCP) y confirmar que la política de RLS de la Ola 4 lo rechaza.
- [ ] 8.4 Revisar que ninguna herramienta, ni el código del servidor MCP, referencia la `service_role` key en ningún punto.
- [ ] 8.5 Correr el test binario de 1.4/3.2 contra producción (`GET .well-known/oauth-authorization-server/auth/v1`) como parte del cierre, para confirmar que el servidor OAuth quedó habilitado antes de dar el cambio por terminado.
