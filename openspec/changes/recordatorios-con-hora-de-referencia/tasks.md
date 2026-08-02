> **El grupo 1 es bloqueante**: sin la hora de referencia no hay contra qué calcular. El
> grupo 2 es la base y es donde está el riesgo real. El grupo 3 es la interfaz.
>
> **Casi todo esto ya existe.** El modelo relativo, el desfase, el recálculo, el trabajo
> periódico, la entrega y el selector con sus dos pestañas y once opciones están
> construidos y funcionan. Lo que se agrega es la hora de referencia y que los relativos
> valgan para tareas sin hora. **Leé el código antes de escribir**: es más fácil romper lo
> que anda que construir lo que falta.

## 1. La hora de referencia (bloqueante)

- [ ] 1.1 Columna nueva en las preferencias del usuario: hora de referencia, como **hora de reloj**, no como instante. El momento se resuelve después, con el día de la tarea y la zona horaria del usuario, que ya es preferencia
- [ ] 1.2 Elegir el valor inicial. Es la pregunta abierta del diseño: proponé uno razonable y decilo
- [ ] 1.3 **No escribir políticas de RLS nuevas**: son por fila y ya cubren cualquier columna. Confirmarlo leyendo la migración original
- [ ] 1.4 Regenerar tipos con `pnpm db:types:local`. **Nunca contra el remoto**
- [ ] 1.5 **Buscar todas las listas de columnas enumeradas a mano.** En la tanda de secciones había tres, no dos, y el síntoma de saltearse una es que el valor se guarda y vuelve vacío

## 2. La base: recálculo y borrado *(acá está el riesgo)*

- [ ] 2.1 Ampliar el disparador para que escuche también los cambios de **día**, no solo los de hora. Sin eso, un relativo sobre una tarea con solo fecha nunca se movería
- [ ] 2.2 Que el recálculo resuelva la hora de referencia cuando la tarea no tenga hora propia
- [ ] 2.3 **Revisar el borrado, que es donde este cambio puede destruir datos del usuario.** Hoy, cuando una tarea se queda sin hora, el disparador **borra** sus relativos pendientes. Tenía sentido cuando quedarse sin hora era quedarse sin referencia; ahora no
- [ ] 2.4 El criterio nuevo (**D-D**): quitarle la hora a una tarea que conserva su día **recalcula**; solo quedarse **sin ninguna fecha** borra
- [ ] 2.5 Los ya entregados no se tocan. Los puntuales tampoco. Eso no cambia
- [ ] 2.6 Probar el camino exacto de 2.3 con datos reales: tarea con hora y recordatorios pendientes, sacarle la hora, y comprobar que **siguen existiendo** y quedaron bien recalculados

## 3. La interfaz

- [ ] 3.1 El selector de recordatorios decide qué ofrece según lo que la tarea tenga (**D-B**): con hora, todo; con solo fecha, los desfases; sin fecha, ninguna relativa
- [ ] 3.2 **"A la hora de la tarea" no se ofrece si la tarea no tiene hora**, aunque haya hora de referencia. Con un desfase la hora de referencia es una convención razonable; "a la hora de la tarea" **afirma** algo sobre la tarea, y sin hora esa afirmación es falsa
- [ ] 3.3 Que el cálculo del momento deje de rechazar las tareas sin hora
- [ ] 3.4 Que las opciones se actualicen **al cambiar la fecha de la tarea sin cerrar el selector**: el dueño pidió que sean dinámicas según lo elegido en la fecha
- [ ] 3.5 La sección de configuración pasa a llamarse "Notificaciones y recordatorios" y suma el campo de la hora
- [ ] 3.6 Actualizar `docs/data-model.md` y la descripción de la sección en `docs/product-spec.md`

## 4. Verificación

- [ ] 4.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 4.2 Si ves muchos tests fallando con `Invalid Chai property`, **no es tu cambio y no reescribas ningún test**: es el árbol de dependencias. Se arregla con `rm -rf node_modules && pnpm install --frozen-lockfile`, y lo causa correr `pnpm install` dentro de un worktree
- [ ] 4.3 Con una tarea **con hora**: se ofrecen todas las opciones, incluida "a la hora de la tarea"
- [ ] 4.4 Con una tarea **con solo fecha**: se ofrecen los desfases y **no** "a la hora de la tarea"
- [ ] 4.5 Con una tarea **sin fecha**: ninguna relativa, y el puntual sigue andando
- [ ] 4.6 Agregar "un día antes" a una tarea sin hora y **comprobar en la base** que quedó el día anterior a la hora de referencia
- [ ] 4.7 Cambiarle el día a esa tarea y comprobar que el recordatorio se movió
- [ ] 4.8 **Sacarle la hora a una tarea con recordatorios y comprobar que no se borraron**
- [ ] 4.9 Dejarla sin ninguna fecha y comprobar que ahí sí se eliminan
- [ ] 4.10 Cambiar la hora de referencia y comprobar que **los ya agendados no se movieron**, y que uno nuevo sí usa la hora nueva
- [ ] 4.11 **Probar con una zona horaria distinta de la del entorno.** Resolver día más hora de reloj a un instante pasa por la zona del usuario, y equivocarse da avisos con horas de diferencia. Es justo lo que un test que corre en la misma zona que la preferencia no ve
- [ ] 4.12 En escritorio y en 390px
