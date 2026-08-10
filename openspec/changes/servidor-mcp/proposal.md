## Why

Hoy la única forma de tocar una cuenta de Trazio es la app. Un servidor MCP
cambia eso: quien quiera puede conectar su cuenta a un asistente de
conversación (Claude, ChatGPT) y leerla o editarla hablando, sin abrir el
navegador. Es una superficie nueva, no una pantalla nueva.

Es viable porque Supabase ya resuelve la parte difícil: un servidor OAuth 2.1
propio (**en beta**), con registro dinámico de clientes y un access token que
sirve contra PostgREST bajo las mismas políticas de RLS que la sesión de la
app — verificado de forma empírica contra el stack local, no asumido. Lo que
falta construir es la pantalla de consentimiento, la pantalla de
aplicaciones conectadas, y el servidor MCP en sí con un conjunto de
herramientas deliberadamente chico.

## What Changes

- Trazio SHALL exponer un servidor MCP sobre HTTP en `app/api/mcp/`, con
  nueve herramientas, todas con identificador en español (vocabulario de
  producto, `.claude/rules/copy.md`): `consultar_tareas`, `obtener_tarea`,
  `listar_estructura`, `listar_habitos`, `crear_tarea` (dedicada, recibe
  lenguaje natural), `crear`, `editar`, `completar_tarea` y `archivar`.
- La autenticación SHALL resolverse con el servidor OAuth 2.1 de Supabase
  (`[auth.oauth_server]`): registro dinámico de clientes, access token que
  aplica RLS, refresh token.
- Trazio SHALL construir la pantalla de consentimiento en
  `/oauth/consent` (leer `authorization_id`, mostrar el cliente que pide
  acceso, aprobar o rechazar) y una pantalla de **aplicaciones conectadas**
  en Configuración (listar y revocar cada conexión).
- La lectura SHALL resolverse directo contra las tablas (RLS ya autoriza) y
  con el RPC `buscar_tareas` para el lenguaje de consulta.
- La escritura SHALL resolverse directo donde el esquema ya protege el
  invariante (título, prioridad, fechas, etiquetas), salvo en tres casos con
  invariantes que el esquema no cubre: completar una tarea recurrente (crea
  la siguiente ocurrencia), escribir la descripción (jsonb de Tiptap, no
  texto plano) y crear algo que necesite `position` (la base lo completa
  cuando no se lo mandan).
- El MCP NUNCA SHALL exponer borrar. Es una propiedad de las herramientas
  que se construyen — y, corrección de la Ola 1 (`design.md` D-C), también
  se enforcea en la base: una política de RLS puede rechazar cualquier
  `DELETE` que traiga el claim `client_id` (marca de origen OAuth), sin
  importar si pasa o no por una herramienta del MCP.
- **BREAKING** respecto del spec vigente: `docs/product-spec.md` §13 dice,
  sin matices, "sin exportar ni importar datos". Se acota (D63, con la misma
  forma que D60 acotó lo mismo para "copiar como markdown"): un servidor MCP
  habilitado por el usuario, revocable, acotado por RLS y sin borrado
  expuesto no es exportar en el sentido que esa decisión prohíbe.

## Capabilities

### New Capabilities

- `mcp`: las nueve herramientas, qué lee cada una, qué escribe cada una, y
  las tres reglas de escritura protegida (recurrencia, descripción,
  posición).
- `consentimiento-oauth`: la pantalla de consentimiento, el registro
  dinámico de clientes, y la pantalla de aplicaciones conectadas
  (listar/revocar).

### Modified Capabilities

- `esquema-datos`: `position` deja de ser obligatorio en el insert de
  `tasks` y `projects` — un trigger la completa cuando no se manda,
  reproduciendo el mismo criterio (último hermano + espaciado) que hoy
  calcula el navegador desde su caché.
- `configuracion`: la sección Configuración suma "Aplicaciones conectadas".

## Impact

**Base de datos** — un trigger nuevo por tabla (`tasks`, `projects`) para el
`position` por defecto, y una migración de políticas de RLS (Ola 4, hallazgo
de la Ola 1) que agrega la condición `client_id is null` a las políticas de
`DELETE` de las tablas alcanzables por el MCP. Sin tabla nueva: el
consentimiento y los grants los administra el propio servidor OAuth de
Supabase (`auth.oauth_clients`, `auth.oauth_authorizations`, tablas internas
de Supabase Auth, no de `public`). **Necesita `supabase db push`** para el
trigger y las políticas, y un `PATCH` a la Management API de Supabase para
habilitar `[auth.oauth_server]` en el proyecto hospedado — confirmado en la
Ola 1 que ni `config.toml` ni `supabase config push` sincronizan esa sección
(la función está en beta en el CLI); ver `design.md` D-A y `tasks.md` Ola 3.

**Dependencias** — ninguna que actualizar. La Ola 1 corrigió la suposición de
que `@supabase/supabase-js` necesitaba actualizarse: `auth.oauth.*`
(`getAuthorizationDetails`, `approveAuthorization`, `denyAuthorization`,
`listGrants`, `revokeGrant`) ya existe en la versión instalada; ver
`design.md` D-B.

**Superficie nueva de mayor riesgo del proyecto** — el token que emite el
servidor OAuth puede hacer, contra PostgREST, casi todo lo que puede hacer el
usuario (no existe un scope de solo lectura; se probó que pedir uno
personalizado hace fallar la autorización). **Corrección de la Ola 1:**
borrar deja de estar en ese "casi todo" una vez que las políticas de RLS de
la Ola 4 estén escritas y probadas — se enforcea en la base, discriminando
por el claim `client_id` del token, no solo en las herramientas que el MCP
ofrece. El resto del riesgo (leer y escribir todo lo que el usuario podría)
sigue sin scope acotado y queda documentado en `design.md`, en D63 y en la
política de privacidad — con dos frases de esos dos últimos documentos que
quedan desactualizadas por esta corrección y hay que ajustar (ver `design.md`
D-C).

**Transporte, confirmado en la Ola 1** — MCP sobre HTTP en Next.js dentro de
Vercel es el camino documentado por Vercel, con el paquete `mcp-handler` v2 y
sin necesidad de Redis (transporte stateless). El límite de 4,5 MB de cuerpo
de respuesta de Vercel pasa a requisito de paginación en las herramientas de
lectura (`design.md` D-I).

**Fuera de alcance** — borrar cualquier entidad desde el MCP; un scope de
permisos de solo lectura (no existe hoy en el servidor OAuth de Supabase);
cualquier código que use la `service_role` key (el MCP opera siempre bajo el
token del usuario, nunca con privilegios elevados); crear o editar
secciones por MCP (la lectura sí las incluye, la escritura no — así lo
acotó el dueño); reordenar manualmente (`position` la resuelve la base, no
el MCP); comentarios y recordatorios (ni lectura ni escritura); conectar
más de un asistente a la vez no tiene límite artificial, pero tampoco se
diseña una experiencia particular para administrar muchos.
