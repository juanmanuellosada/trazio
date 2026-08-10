# Habilitar el servidor OAuth 2.1 de Supabase en producción

Necesario para que el servidor MCP (`app/api/mcp/`, capacidad `mcp` /
`consentimiento-oauth`) funcione contra el proyecto hospedado. En local
funciona sin este trámite: alcanza con `supabase/config.toml` (ya
commiteado con `[auth.oauth_server] enabled = true`).

## Por qué esto no es un `supabase config push`

El servidor OAuth 2.1 de Supabase está **en beta**
(https://supabase.com/docs/guides/auth/oauth-server/getting-started). En el
código del CLI, las dos funciones que sincronizarían `[auth.oauth_server]`
al proyecto hospedado son cuerpos vacíos con `// TODO(cemal) :: implement
me`. Consecuencia: poner `enabled = true` en `config.toml` **no hace nada**
en producción, y `supabase link` **tampoco reporta la deriva** — queda
inconsistente en silencio, sin ningún error visible. No es la misma clase de
olvido que "hacer `git push` sin `supabase db push`" (ahí el CLI al menos
tiene el comando correcto; acá el comando correcto **no existe** todavía).

El único camino reproducible es la Management API de Supabase
(`PATCH /v1/projects/{ref}/config/auth`), que sí expone los tres campos:

- `oauth_server_enabled`
- `oauth_server_allow_dynamic_registration`
- `oauth_server_authorization_path`

Ver `openspec/changes/servidor-mcp/design.md`, decisión D-A, para el detalle
completo de cómo se validó esto.

## Antes de correr nada

1. **Confirmar el Site URL del proyecto.** Por un asunto sin resolver del
   lado del proveedor, la pantalla de consentimiento (`/oauth/consent`)
   **tiene que vivir en el mismo origen que el Site URL** configurado en
   Supabase (Authentication → URL Configuration en el panel). Producción
   sirve canónicamente `www.trazio.com.ar` (`lib/site-url.ts`) — confirmar
   que el Site URL del proyecto sea ese dominio antes de seguir. El script
   del paso 2 advierte si no coincide, pero no lo puede corregir por vos.
2. **Generar un token personal de la Management API.**
   https://supabase.com/dashboard/account/tokens → crear uno nuevo. No es
   la `SUPABASE_SERVICE_ROLE_KEY` ni la clave publicable del proyecto: es un
   token de cuenta, con acceso a la configuración de **todos** tus proyectos
   de Supabase. Tratarlo como una contraseña — nunca commitearlo, nunca
   loguearlo, nunca pasarlo como argumento de línea de comandos (queda en el
   historial del shell; usar variable de entorno).

## Paso 1 — Revisar qué va a cambiar (solo lectura, sin escribir nada)

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=aqijvhoesjozstzojlzr \
  node scripts/enable-oauth-server.mjs
```

Sin `--apply`, el script **solo lee**: hace un `GET` a
`/v1/projects/{ref}/config/auth`, compara los tres campos contra el estado
deseado y los imprime lado a lado, más una advertencia si el Site URL
configurado no coincide con `www.trazio.com.ar`. No escribe nada.

## Paso 2 — Aplicar

Una vez revisado el diff del paso 1:

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=aqijvhoesjozstzojlzr \
  node scripts/enable-oauth-server.mjs --apply
```

El script hace el `PATCH`, vuelve a consultar la Management API para
confirmar que los tres campos quedaron en el estado deseado, y después
confirma contra el endpoint público de metadata:

```
GET https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1
```

Con el servidor OAuth apagado, ese endpoint devuelve 404 con
`feature_disabled` en el cuerpo — es el test binario de si quedó prendido.
Si después del `PATCH` sigue devolviendo eso, el script termina con error
(puede ser demora de propagación: correrlo de nuevo sin `--apply` en un rato
para confirmar).

Es idempotente: correrlo de nuevo con `--apply` cuando ya está todo en el
estado deseado no manda ningún `PATCH`, solo confirma y sale.

## Paso 3 — Probar el registro dinámico de un cliente real

Con el servidor prendido, confirmar que un cliente puede darse de alta
solo (sin secreto, `client_type: public`):

```bash
curl -X POST https://<ref>.supabase.co/auth/v1/oauth/clients/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"prueba","redirect_uris":["https://www.trazio.com.ar/oauth/consent"],"grant_types":["authorization_code","refresh_token"],"response_types":["code"],"token_endpoint_auth_method":"none"}'
```

Debe devolver un `client_id` sin `client_secret`. Es la pieza que permite
que un cliente MCP (Claude u otro) se conecte sin trámite manual.

## Qué no resuelve este documento

- **Fecha de disponibilidad general (GA) del servidor OAuth** — no hay
  fecha conocida. Cuando exista, `supabase config push` debería empezar a
  sincronizar `[auth.oauth_server]` como cualquier otra sección, y este
  script (y este documento) dejan de hacer falta.
- **Qué pasa con clientes ya registrados y tokens vigentes si el servidor
  OAuth se desactiva más adelante** — no probado, ver Open Questions de
  `openspec/changes/servidor-mcp/design.md`.
