-- Protección de la Bandeja de entrada a nivel de base de datos, no solo
-- de interfaz: rechaza borrarla, archivarla o quitarle el is_inbox.
create or replace function public.projects_protect_inbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_inbox then
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

create trigger projects_protect_inbox_trigger
  before delete or update on public.projects
  for each row
  execute function public.projects_protect_inbox();
