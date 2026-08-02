> **El grupo 1 es bloqueante**: hasta que el bloque de hora no se pueda usar desde afuera,
> los tres arreglos no tienen con qué reemplazar el control nativo.
>
> **Esto corrige una deuda que ya se propagó citándose a sí misma**: el comentario del
> editor de eventos dice que copió el criterio del selector de recordatorios. Por eso se
> amplía la regla además de arreglar los casos.

## 1. El bloque de hora, usable desde afuera (bloqueante)

- [ ] 1.1 Hoy vive dentro del selector de vencimiento, que escribe en los campos de una tarea. Hay que poder usarlo desde el recordatorio y desde el evento
- [ ] 1.2 Decidir entre extraerlo o parametrizar el que hay (**D-B**), mirando cuánto arrastra: **maneja formato de 12 y 24 horas, opciones predefinidas y entrada libre tipeada con su propio error**. Contá qué elegiste
- [ ] 1.3 **No lo copies.** Sería un tercer lugar con la misma lógica y la próxima corrección tocaría dos de tres
- [ ] 1.4 **Que el selector de vencimiento no cambie.** Es de los controles más usados de la aplicación y sacarle el bloque mal lo rompe

## 2. Los tres controles nativos

- [ ] 2.1 `components/reminders/reminder-picker.tsx`: el modo puntual pasa al calendario propio más el bloque de hora
- [ ] 2.2 `components/tasks/recurrence-editor.tsx`: el fin de la recurrencia pasa al calendario propio
- [ ] 2.3 `components/calendar/edit-event-dialog.tsx`: sus tres campos nativos pasan a los componentes propios. **Nada más de ese archivo**: tiene su propia propuesta y meter mano acá la pisaría
- [ ] 2.4 **Buscar si quedó algún cuarto caso.** La regla ahora rige para cualquier superficie; si aparece uno más, arreglalo y decilo

## 3. El rediseño del recordatorio

- [ ] 3.1 Los dos modos dejan de ser dos botones que cambian de color y pasan a ser una elección clara entre **fecha y hora fija** y **relativo a la tarea**
- [ ] 3.2 El modo relativo pasa de una grilla de once botones a un **desplegable**, que es lo que mostró el dueño
- [ ] 3.3 **Ojo con las opciones dinámicas**: cambian según la tarea tenga hora, solo fecha o nada. Fijate qué pasa si la fecha de la tarea cambia con el selector abierto — un desplegable que cambia de contenido mientras está abierto es confuso
- [ ] 3.4 La lista de recordatorios ya agregados y el quitarlos siguen funcionando igual
- [ ] 3.5 **No cambies la lógica**: qué se guarda y cuándo suena se acaba de hacer y está verificado

## 4. Verificación

- [ ] 4.1 `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 4.2 **Un test que busque controles nativos de fecha y hora en lo renderizado.** Es justo la clase de deuda que vuelve, y es de lo poco de esta tanda que un test sí puede sostener
- [ ] 4.3 En el navegador: el recordatorio puntual, el fin de la recurrencia y los horarios del evento, con los componentes propios
- [ ] 4.4 Que el selector de vencimiento siga andando igual: fecha, hora, duración, accesos rápidos y lenguaje natural
- [ ] 4.5 Los recordatorios relativos siguen ofreciendo lo que corresponde según lo que la tarea tenga
- [ ] 4.6 En escritorio y en 390px, donde un calendario propio dentro de un popover es más fácil que se desborde que un control nativo
