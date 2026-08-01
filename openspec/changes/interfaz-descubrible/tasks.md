> **Cómo se ejecutan estas tandas.** El grupo 1 es bloqueante: los indicadores no
> se pueden dibujar mientras las teclas estén por cambiar. Después, los grupos 2 y
> 3 corren **en paralelo** porque no comparten archivos. El grupo 4 es la
> verificación.
>
> Nadie corre `git stash`, `git reset` ni `git checkout` en una tanda paralela.
>
> **Esta tanda es enteramente visual.** `pnpm lint && pnpm typecheck && pnpm test`
> en verde no prueba absolutamente nada acá: cada grupo se verifica abriendo el
> navegador, en escritorio y en 390px de ancho.

## 1. Localizar los atajos (bloqueante)

- [ ] 1.1 `lib/shortcuts/chord.ts`: `t` pasa a `h` para Hoy, y `u` pasa a `p` para Próximos. `i`, `c` y `a` no cambian
- [ ] 1.2 Verificar que `h` y `p` no colisionan con ningún binding existente, ni global ni por pantalla ni del detalle de tarea
- [ ] 1.3 Actualizar `lib/shortcuts/chord.test.ts` y `components/shortcuts/shortcut-provider.test.tsx`, que hoy fijan las teclas viejas
- [ ] 1.4 Corregir la sección 10 de `docs/product-spec.md`, que documenta `G T` y `G U`
- [ ] 1.5 Probar en el navegador que `G H` lleva a Hoy y `G P` a Próximos, y que las teclas viejas ya no hacen nada

## 2. Indicadores de atajo *(paralelo tras el grupo 1)*

- [ ] 2.1 Componente compartido que dibuja una tecla, en `components/shortcuts/`
- [ ] 2.2 Un acorde se dibuja como **dos teclas separadas**, no como una cadena: son dos pulsaciones y la forma tiene que decirlo
- [ ] 2.3 El indicador se alimenta de la misma definición que registra el atajo (decisión **D-C**), no de una cadena escrita a mano
- [ ] 2.4 Donde eso exija una refactorización grande, se acepta la cadena literal **con un test que verifique que coincide con el binding real**. No es opcional: es lo que hace segura la decisión
- [ ] 2.5 No se muestran por debajo del punto de corte de teléfono
- [ ] 2.6 Montarlos en el panel lateral: Bandeja, Hoy, Próximos, Hábitos, Completado, buscador, agregar tarea, agregar evento
- [ ] 2.7 Montarlos en el menú contextual de tarea
- [ ] 2.8 Montarlos en los botones que tengan atajo y estén a la vista
- [ ] 2.9 Tests del componente, incluida la regla de que un acorde son dos teclas
- [ ] 2.10 **Probar cada indicador apretando la tecla que anuncia.** Un indicador que miente es peor que no tenerlo, y es exactamente lo que un test de render no detecta

## 3. El panel de Formato *(paralelo tras el grupo 1)*

- [ ] 3.1 Reorganizar `components/view-options/view-options-bar.tsx`: un único disparador que abre un panel
- [ ] 3.2 Sección **Vista**: lista, panel, calendario, y el formato de calendario solo cuando la forma de ver es calendario
- [ ] 3.3 Los interruptores de completadas y de hábitos, dentro de Vista
- [ ] 3.4 Sección **Orden**: agrupar por, ordenar por
- [ ] 3.5 Sección **Filtro**: fecha límite, prioridad, etiqueta
- [ ] 3.6 Restablecer, al final del panel
- [ ] 3.7 **El disparador indica cuándo hay opciones activas distintas de las por defecto.** Sin esto, agrupar esconde estado y la lista se ve distinta sin explicación
- [ ] 3.8 Que las opciones sigan persistiéndose igual: `view_preferences` y su esquema no cambian
- [ ] 3.9 Por **D24**, verificar que nada quedó inalcanzable al mover controles adentro del panel
- [ ] 3.10 Probar el panel en **390px**, que es donde la barra plana ya se envolvía y el problema más molesta
- [ ] 3.11 Actualizar los tests de `view-options-bar` que asumen la estructura plana

## 4. Sacar el ícono del título *(paralelo tras el grupo 1)*

- [ ] 4.1 `components/projects/sectioned-tasks.tsx` — Bandeja y Proyecto
- [ ] 4.2 `components/tasks/proximos-view.tsx`
- [ ] 4.3 `components/tasks/completed-view.tsx`
- [ ] 4.4 `components/projects/project-header.tsx`
- [ ] 4.5 Revisar si quedó alguna vista con ícono en el título que no esté en la lista: etiqueta, filtro, hábitos
- [ ] 4.6 **No extraer un encabezado compartido** (decisión D-E): los cuatro encabezados no son iguales entre sí y unificarlos produciría un componente con cinco banderas

## 5. Verificación

- [ ] 5.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 5.2 Recorrido completo en el navegador, en escritorio y en 390px
- [ ] 5.3 Cada indicador de atajo verificado apretando su tecla
- [ ] 5.4 El disparador del panel muestra que hay opciones activas cuando las hay
- [ ] 5.5 Ninguna sección conserva el ícono en el título
- [ ] 5.6 Las opciones guardadas antes del cambio se siguen leyendo bien
