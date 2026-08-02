> **Esta tanda va última de las cinco.** Depende de `sin-controles-nativos`, que le saca los
> controles nativos al editor de eventos, y de `repeticion-configurable`, que le da el
> diálogo de repetición personalizada. Ir antes significa hacer trabajo que después se tira.
>
> **No hay backend que escribir.** El cliente de Google ya acepta inicio, fin, recurrencia,
> descripción y ubicación, y la recurrencia ya se usa en producción para partir series.
> Falta exponerlo. **Leé el cliente antes de tocar nada.**

## 1. Un solo diálogo

- [ ] 1.1 Unificar crear y editar (**D-A**). La excusa de que crear recibe un rango de solo lectura desaparece en cuanto el rango deja de serlo
- [ ] 1.2 Lo que sí cambia según el modo es **el alcance**: al editar un evento de una serie hay que preguntar si el cambio es para esa ocurrencia, para esta y las siguientes o para todas. Al crear no hay nada que preguntar
- [ ] 1.3 **El camino de editar es el que más se usa y hoy funciona.** Unificar mal lo deja peor que antes: verificalo a fondo, no solo el de crear

## 2. El horario

- [ ] 2.1 Fecha, hora de inicio y hora de fin editables, con los componentes propios —los nativos se los saca la tanda anterior
- [ ] 2.2 Interruptor de todo el día: al activarlo desaparecen las horas
- [ ] 2.3 El horario **se propone y se puede corregir** (**D-B**): desde el calendario, el rango arrastrado; desde el panel lateral, el que ya se calcula. Nunca de solo lectura
- [ ] 2.4 Que el fin no pueda quedar antes que el inicio

## 3. La repetición

- [ ] 3.1 Opciones rápidas **derivadas de la fecha elegida** (**D-C**): si el evento es un martes, "cada semana" dice cada martes
- [ ] 3.2 "Personalizada" **comparte el diálogo con el de tareas**. No lo escribas de nuevo
- [ ] 3.3 **Ese diálogo tiene una parte que no aplica acá**: elegir si la recurrencia cuenta desde lo programado o desde lo completado tiene sentido en una tarea y ninguno en un evento. Tiene que poder ocultarse
- [ ] 3.4 **Resolver el cruce con el alcance de series** (riesgo principal): cambiar la regla de repetición con alcance "solo esta ocurrencia" no significa nada. Que ese alcance no se ofrezca cuando lo que cambió es la regla

## 4. Descripción y ubicación

- [ ] 4.1 Los dos campos, que ya están en el modelo, en el cliente y en lo que el spec exige mostrar
- [ ] 4.2 **Ubicación es texto libre**, no geolocalización
- [ ] 4.3 **No agregues invitados, adjuntos ni videollamada** (**D-E**). Los dos primeros están vetados por escrito en cuatro y cinco fuentes; el tercero no existe en el cliente y nadie lo pidió

## 5. Verificación

- [ ] 5.1 `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 5.2 Si ves muchos tests fallando con `Invalid Chai property`, **no es tu cambio y no reescribas ningún test**: es el árbol de dependencias. `rm -rf node_modules && pnpm install --frozen-lockfile`, y no corras `pnpm install` dentro de un worktree
- [ ] 5.3 Crear un evento **desde el panel lateral** eligiendo un horario distinto del propuesto, y comprobar en Google que quedó bien
- [ ] 5.4 Crear uno **arrastrando en el calendario** y corregirle el horario antes de guardar
- [ ] 5.5 Crear uno de todo el día
- [ ] 5.6 Crear uno que se repite, y comprobar que en Google quedó como serie
- [ ] 5.7 **Editar un evento de una serie**: que el alcance siga preguntándose y que cambiar la regla no ofrezca "solo esta ocurrencia"
- [ ] 5.8 Descripción y ubicación se guardan y se leen
- [ ] 5.9 **En 390px**: el formulario pasó de dos campos a ocho y ahí se desplaza. Mirarlo
- [ ] 5.10 Que no haya quedado ningún control nativo del navegador

**Ojo con el entorno**: crear eventos toca **Google de verdad**, no una base local. Usá una cuenta de prueba o borrá lo que crees, y decí explícitamente qué usaste.
