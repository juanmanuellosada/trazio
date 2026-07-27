-- Corrige el trigger de 20260726011604_projects_inbox_protection.sql: al
-- borrar la cuenta (fila de auth.users), la cascada de FKs intenta borrar
-- también la Bandeja, y el trigger la rechazaba, así que el borrado de
-- cuenta fallaba entero.
--
-- Sigue bloqueando que el usuario borre, archive o le quite is_inbox a su
-- Bandeja por su cuenta. Solo se permite el borrado cuando ya no queda fila
-- padre en auth.users, es decir cuando el borrado viene de la cascada de
-- borrado de cuenta. Comprobado empíricamente en Postgres (delete directo
-- del proyecto vs. delete de auth.users que cascadea): durante la cascada,
-- la fila de auth.users ya no está presente en el momento en que este
-- trigger se dispara, así que EXISTS(...) distingue los dos casos.
create or replace function public.projects_protect_inbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_inbox and exists (select 1 from auth.users where id = old.user_id) then
      raise exception 'La Bandeja de entrada no se puede eliminar';
    end if;
    return old;
  end if;

  -- tg_op = 'UPDATE'
  if old.is_inbox then
    if new.is_archived then
      raise exception 'La Bandeja de entrada no se puede archivar';
    end if;
    if not new.is_inbox then
      raise exception 'La Bandeja de entrada no puede perder su condición de Bandeja';
    end if;
  end if;

  return new;
end;
$$;
