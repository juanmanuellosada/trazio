-- El advisor de seguridad de Supabase marca projects_check_hierarchy() y
-- projects_protect_inbox() como SECURITY DEFINER ejecutables por anon y
-- authenticated vía /rest/v1/rpc/: por defecto, CREATE FUNCTION otorga
-- EXECUTE a PUBLIC, y ninguna de las dos migraciones que las crearon lo
-- revocó. Son funciones de trigger (devuelven trigger); invocarlas fuera
-- de un trigger falla, así que el riesgo real es bajo, pero es superficie
-- de API que no tiene por qué existir. Revocar EXECUTE no rompe los
-- triggers: Postgres los dispara con los privilegios del dueño de la
-- función (por ser SECURITY DEFINER), no con los del rol que hizo el
-- INSERT/UPDATE.
revoke execute on function public.projects_check_hierarchy() from anon, authenticated;
revoke execute on function public.projects_protect_inbox() from anon, authenticated;
