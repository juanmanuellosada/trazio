-- Corrige 20260726013239_security_revoke_trigger_execute.sql y las
-- migraciones de esta misma tanda (tasks_validate_owner_trigger.sql,
-- account_provisioning_trigger.sql): revocar EXECUTE de anon y
-- authenticated puntualmente no alcanza. CREATE FUNCTION otorga EXECUTE a
-- PUBLIC por defecto, y ese privilegio es aditivo: un rol tiene el
-- privilegio si se lo dieron a él directamente O a PUBLIC, sin importar
-- qué se le haya revocado a él en particular. El advisor de seguridad lo
-- siguió marcando después del REVOKE anterior porque la entrada `=X` (el
-- grant a PUBLIC) seguía en el ACL de las cuatro funciones. Se corrige acá
-- en vez de editar esas migraciones, que ya están aplicadas.
revoke execute on function public.projects_check_hierarchy() from public;
revoke execute on function public.projects_protect_inbox() from public;
revoke execute on function public.tasks_validate_owner() from public;
revoke execute on function public.handle_new_user() from public;
