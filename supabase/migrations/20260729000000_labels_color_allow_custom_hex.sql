-- D29 extendido a etiquetas: el color personalizado de un proyecto (D29,
-- 20260727190000_projects_color_allow_custom_hex.sql) se extiende ahora a
-- etiquetas, según el requirement "El color de la etiqueta usa el mismo
-- selector que el color de proyecto" de la capacidad
-- `administracion-de-etiquetas` — el mismo componente
-- (`components/projects/color-swatch-picker.tsx`) se reutiliza para el
-- color de una etiqueta, así que `labels.color` tiene que admitir el mismo
-- hex personalizado que `projects.color`, además de los diez
-- identificadores de la paleta. A diferencia de `projects_color_check`, acá
-- no hay rama de `is_inbox`: ninguna etiqueta es especial de esa forma.
--
-- El formato es lo único que valida este constraint: el mínimo de
-- contraste contra los dos temas (D29) lo valida `lib/validation/labels.ts`
-- (Zod, mismos helpers que `lib/validation/colors.ts`) antes de guardar, no
-- la base.
alter table public.labels drop constraint labels_color_check;

alter table public.labels add constraint labels_color_check
  check (
    color in (
      'amarillo', 'lima', 'verde', 'turquesa', 'celeste',
      'indigo', 'violeta', 'purpura', 'magenta', 'marron'
    )
    or color ~ '^#[0-9A-Fa-f]{6}$'
  );
