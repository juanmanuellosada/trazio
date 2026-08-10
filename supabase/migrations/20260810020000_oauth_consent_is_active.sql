-- Ola 4 de `servidor-mcp` (D-K de `design.md`, hallazgo del cierre):
-- revocar un asistente conectado cortaba la renovación al instante, pero
-- el access token ya emitido seguía sirviendo hasta que vencía solo (una
-- hora). Se probó la vía barata antes de escribir esto — contra el stack
-- local, con el consentimiento ya marcado `revoked_at`, ni
-- `/auth/v1/oauth/userinfo` ni PostgREST rechazan el mismo token: los dos
-- siguen devolviendo 200. No alcanza, así que hace falta esta función: el
-- servidor MCP la consulta en cada pedido (`lib/mcp/auth.ts`) antes de
-- aceptar el token, y un permiso revocado deja de servir en el mismo
-- pedido, no en la próxima hora.
--
-- Sin parámetros a propósito — mismo motivo que la Regla 1 de
-- `get_shared_project` (20260809030000): si aceptara un `user_id`,
-- cualquier usuario autenticado podría preguntar por el consentimiento de
-- otro. La identidad sale de `auth.uid()` y el cliente de
-- `auth.jwt() ->> 'client_id'` — los mismos dos datos que ya lee la
-- política de DELETE de 20260810010000_oauth_client_delete_restrictions.sql,
-- acá usados para positivo ("¿sigue activo?") en vez de negativo ("¿vino
-- por OAuth?").
--
-- `security definer` porque `auth.oauth_consents` no es legible por
-- `authenticated` (el esquema `auth` no le otorga nada al rol de la app).
-- `set search_path = ''` para no depender del search_path de quien llama,
-- igual que el resto de las funciones definer del proyecto — por eso
-- `auth.oauth_consents` y `auth.uid()`/`auth.jwt()` van con el esquema
-- calificado. Devuelve un booleano y nada más: ninguna fila de `auth` sale
-- de acá.
--
-- Sin `client_id` en el JWT (sesión normal de la app) o sin sesión: el
-- filtro nunca matchea (`c.client_id = null::uuid` no es cierto para
-- ninguna fila) y la función devuelve `false`. No hay una rama aparte que
-- distinga "no hay consentimiento" de "no hay client_id que preguntar" —
-- las dos tienen que rechazar, y alcanza con que el filtro no matchee.
create or replace function public.oauth_consent_is_active()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active boolean;
begin
  select exists (
    select 1
    from auth.oauth_consents c
    where c.user_id = (select auth.uid())
      and c.client_id = ((select auth.jwt() ->> 'client_id'))::uuid
      and c.revoked_at is null
  )
  into v_active;

  return v_active;
end;
$$;

-- CREATE FUNCTION otorga EXECUTE a PUBLIC por defecto — la causa exacta de
-- la auditoría de 20260809040000_security_function_grants_audit.sql. Se
-- revoca de los tres roles y se otorga solo a `authenticated`. Nunca
-- `anon`: sin sesión, `auth.uid()` es null y la función ya devuelve
-- `false`, pero no hay motivo para exponerla a un rol que nunca trae un
-- token OAuth.
revoke execute on function public.oauth_consent_is_active() from public, anon, authenticated;
grant execute on function public.oauth_consent_is_active() to authenticated;
