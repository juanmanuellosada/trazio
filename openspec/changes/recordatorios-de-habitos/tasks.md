## 1. Esquema y RLS

- [x] 1.1 Migración con `habit_reminders` (`id`, `user_id`, `habit_id`, `offset_minutes`), RLS y las cuatro políticas en el mismo archivo, `check (offset_minutes <= 0)`, `unique (habit_id, offset_minutes)`, índice sobre `user_id` y FK en cascada desde `habits` y `auth.users`.
- [x] 1.2 En la misma migración, `habit_reminder_deliveries` (`habit_id`, `user_id`, `date`, `offset_minutes`, `delivered_at`) con PK compuesta `(habit_id, date, offset_minutes)`, RLS con las cuatro políticas e índice sobre `user_id`. Dejar comentado en el archivo por qué la PK es el mecanismo de entrega única y no un detalle de indexación.
- [x] 1.3 Sumar `habit_reminders` a la publicación de Realtime, con `replica identity full` si Realtime la filtra por `user_id` (D37). `habit_reminder_deliveries` queda afuera a propósito: dejarlo escrito en el archivo.
- [x] 1.4 `pnpm db:types` y confirmar que las dos tablas aparecen en los tipos generados.

## 2. Reclamo en SQL

- [x] 2.1 Escribir `claim_due_habit_reminders(p_limit integer)`, `security definer` con `search_path = public`, como un único `insert … select … on conflict do nothing returning`. Revocar de `public`, otorgar a `service_role`.
- [x] 2.2 Dentro de esa consulta: `fecha_local` desde `user_preferences.timezone`, hora efectiva por `coalesce(override, habits.scheduled_time, user_preferences.reference_time)`, y el instante como `((fecha_local + hora_efectiva) at time zone tz) + make_interval(mins => offset_minutes)`.
- [x] 2.3 Aplicar los descartes de D-F: `is_archived = false`, fecha ≥ `created_at` en la zona del usuario, la frecuencia cubre el día (`daily` y `times_per_week` siempre; `specific_days` por `extract(isodow …)` contra `days_of_week`), sin fila en `habit_completions` y sin fila en `habit_skips` para ese día.
- [x] 2.4 Acotar el intervalo a `momento <= now() and momento > now() - interval '15 minutes'` (D-D), con un comentario explicando por qué acá sí hay cota inferior y en `claim_due_reminders` no.
- [x] 2.5 Purgar en la misma corrida las filas de `habit_reminder_deliveries` anteriores a 7 días.
- [x] 2.6 Devolver `habit_id`, `user_id` y el nombre del hábito, para que la edge function no necesite una consulta más.

## 3. Tests del reclamo

- [x] 3.1 Montar los casos borde contra la función en `vitest.rls.config.ts`: hábito creado a mitad de semana, `specific_days` en un día que no toca, salteado, completado, archivado, override que corre la hora, hábito sin hora usando la hora de referencia.
- [x] 3.2 Probar el cruce de medianoche en una zona con desfase (America/Argentina/Buenos_Aires, UTC-3): un hábito de las 23:30 con aviso "1 hora antes" tiene que resolverse contra el día local correcto, no contra el día UTC.
- [x] 3.3 Probar la entrega única con dos llamadas concurrentes: una devuelve la fila, la otra cero.
- [x] 3.4 Probar la ventana de gracia: un aviso de hace 10 minutos se envía, uno de hace 20 no.
- [x] 3.5 Probar que `claim_due_habit_reminders` no es ejecutable por una cuenta autenticada.
- [x] 3.6 Dejar en `lib/habits/pending-today.ts` y en la migración un comentario cruzado apuntando al otro (D-G): son la misma regla en dos lenguajes.

## 4. Entrega

- [x] 4.1 En `supabase/functions/enviar-recordatorios/index.ts`, sumar el segundo `rpc` a `claim_due_habit_reminders` y unificar los dos resultados antes de repartir a las suscripciones. Reusar tal cual la agrupación por usuario, el manejo de 404/410 y el borrado de suscripciones inválidas.
- [x] 4.2 Cambiar el payload a `{ title, url }`, con `url` ya resuelto (`/tarea/<id>` o `/habitos`), conservando `taskId` para los service workers viejos (D-H).
- [x] 4.3 En `public/sw.js`, navegar a `payload.url` con respaldo en `taskId`. Actualizar el comentario de cabecera, que hoy afirma que el payload es siempre `{ title, taskId }`.
- [x] 4.4 Verificar que si el reclamo de hábitos falla, los recordatorios de tarea ya reclamados igual se envían: un error en la mitad nueva no puede tirar abajo la que ya funciona.

## 5. Interfaz

- [x] 5.1 Módulo `lib/habits/reminders.ts` con las opciones relativas del hábito (a la hora, 10/15/30/45 min, 1/2/3 h). No reusar `RELATIVE_REMINDER_OPTIONS` tal cual: los días y la semana antes no aplican a un hábito.
- [x] 5.2 Cuando el hábito no tiene hora programada, el texto de cada opción nombra la hora de referencia del usuario en vez de un genérico "antes".
- [x] 5.3 Hooks de lectura y mutación (`use-habit-reminders`, agregar y quitar), siguiendo el patrón de `lib/reminders/`, con el error de duplicado traducido al español en `lib/habits/errors.ts`.
- [x] 5.4 Sumar el bloque de recordatorios a `components/habits/habit-form-dialog.tsx`, con el mismo tratamiento visual que el selector de recordatorios de una tarea.
- [x] 5.5 Tests de componente del bloque: agregar, quitar, que no se ofrezca ninguna opción puntual, y que el texto cambie cuando el hábito no tiene hora.

## 6. Documentación

- [x] 6.1 Actualizar `docs/product-spec.md`: la entidad Hábito deja de decir que no tiene recordatorios, y la sección 9 suma las reglas propias del hábito.
- [x] 6.2 Actualizar `docs/data-model.md` con las dos tablas nuevas.
- [x] 6.3 Anotar en `docs/decisions.md` las decisiones D-A (evaluar al enviar, no materializar) y D-D (ventana de gracia de 15 minutos), que son las dos que un lector futuro va a querer discutir.

## 7. Verificación

- [x] 7.1 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 7.2 Aplicar la migración con `supabase db push` y desplegar con `supabase functions deploy enviar-recordatorios`, en ese orden. `git push` no hace ninguna de las dos cosas.
- [ ] 7.3 Verificar en el navegador con un dispositivo real: crear un hábito con aviso a un minuto vista, confirmar que llega una sola vez y que tocarla abre Hábitos. Después completar el hábito antes de la hora y confirmar que el aviso no llega.
- [ ] 7.4 Medir la consulta del reclamo con datos sembrados (no con una cuenta vacía) y confirmar que entra cómoda en el minuto; si no, acotar por lote como `claim_due_reminders(p_limit)`.
