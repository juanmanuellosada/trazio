-- D29: el color personalizado de un proyecto convive con la paleta fija de
-- D19 en vez de reemplazarla. `projects_color_check` (última vez ampliado en
-- 20260727010000_projects_color_null_for_inbox.sql) hoy solo admite los diez
-- identificadores de la paleta para un proyecto normal, y nulo para la
-- Bandeja. Se amplía para admitir también un color personalizado en formato
-- hexadecimal de seis dígitos (#RRGGBB).
--
-- El formato es lo único que valida este constraint: el mínimo de contraste
-- contra los dos temas (D29) lo valida `lib/validation/projects.ts` (Zod)
-- antes de guardar, no la base — un check constraint no tiene forma
-- razonable de calcular contraste WCAG. La regla de la Bandeja (D27: `color`
-- nulo, nunca un valor elegible) no cambia.
alter table public.projects drop constraint projects_color_check;

alter table public.projects add constraint projects_color_check
  check (
    (is_inbox and color is null)
    or
    (not is_inbox and color is not null and (
      color in (
        'amarillo', 'lima', 'verde', 'turquesa', 'celeste',
        'indigo', 'violeta', 'purpura', 'magenta', 'marron'
      )
      or color ~ '^#[0-9A-Fa-f]{6}$'
    ))
  );
