-- El design de fase 1 (sección B3) fija el color de la Bandeja de entrada
-- en '#283B56' (azul de marca), pero projects_color_check
-- (20260726011602_projects.sql) solo admite los diez colores con nombre de
-- la paleta fija de usuario. Los dos documentos no se cruzaron: la Bandeja
-- es un proyecto especial que no se puede renombrar, borrar ni recolorear
-- desde la interfaz (mismo criterio que ya se aplica a su `icon`, fijo en
-- vez de emoji), así que tiene sentido que su color tampoco salga de la
-- paleta seleccionable por el usuario. Se amplía el constraint para admitir
-- ese único valor adicional, en vez de tocar la migración ya aplicada.
alter table public.projects drop constraint projects_color_check;

alter table public.projects add constraint projects_color_check
  check (color in (
    'amarillo', 'lima', 'verde', 'turquesa', 'celeste',
    'indigo', 'violeta', 'purpura', 'magenta', 'marron',
    '#283B56'
  ));
