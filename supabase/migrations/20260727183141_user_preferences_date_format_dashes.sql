-- user_preferences.date_format usaba 'dd/MM/yyyy'; pasa a 'dd-MM-yyyy' (guion
-- en vez de barra, pedido del dueño). 'yyyy-MM-dd' no cambia. No se toca la
-- migración original (20260726011559_user_preferences.sql): se corrige acá.

alter table public.user_preferences
  drop constraint user_preferences_date_format_check;

update public.user_preferences
  set date_format = 'dd-MM-yyyy'
  where date_format = 'dd/MM/yyyy';

alter table public.user_preferences
  alter column date_format set default 'dd-MM-yyyy',
  add constraint user_preferences_date_format_check
    check (date_format in ('dd-MM-yyyy', 'yyyy-MM-dd'));
