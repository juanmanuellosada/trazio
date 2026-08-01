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

- [x] 1.1 `lib/shortcuts/chord.ts`: `t` pasa a `h` para Hoy, y `u` pasa a `p` para Próximos. `i`, `c` y `a` no cambian
- [x] 1.2 Verificar que `h` y `p` no colisionan con ningún binding existente, ni global ni por pantalla ni del detalle de tarea
- [x] 1.3 Actualizar `lib/shortcuts/chord.test.ts` y `components/shortcuts/shortcut-provider.test.tsx`, que hoy fijan las teclas viejas
- [x] 1.4 Corregir la sección 10 de `docs/product-spec.md`, que documenta `G T` y `G U`
- [x] 1.5 Probar en el navegador que `G H` lleva a Hoy y `G P` a Próximos, y que las teclas viejas ya no hacen nada

## 2. Indicadores de atajo *(paralelo tras el grupo 1)*

- [x] 2.1 Componente compartido que dibuja una tecla, en `components/shortcuts/`
- [x] 2.2 Un acorde se dibuja como **dos teclas separadas**, no como una cadena: son dos pulsaciones y la forma tiene que decirlo
- [x] 2.3 El indicador se alimenta de la misma definición que registra el atajo (decisión **D-C**), no de una cadena escrita a mano
- [x] 2.4 Donde eso exija una refactorización grande, se acepta la cadena literal **con un test que verifique que coincide con el binding real**. No es opcional: es lo que hace segura la decisión
- [x] 2.5 No se muestran por debajo del punto de corte de teléfono
- [x] 2.6 Montarlos en el panel lateral: Bandeja, Hoy, Próximos, Hábitos, Completado, buscador, agregar tarea, agregar evento
- [x] 2.7 Montarlos en el menú contextual de tarea
- [x] 2.8 Montarlos en los botones que tengan atajo y estén a la vista
- [x] 2.9 Tests del componente, incluida la regla de que un acorde son dos teclas
- [x] 2.10 **Probar cada indicador apretando la tecla que anuncia.** Un indicador que miente es peor que no tenerlo, y es exactamente lo que un test de render no detecta

## 3. El panel de Formato *(paralelo tras el grupo 1)*

- [x] 3.1 Reorganizar `components/view-options/view-options-bar.tsx`: un único disparador que abre un panel
- [x] 3.2 Sección **Vista**: lista, panel, calendario, y el formato de calendario solo cuando la forma de ver es calendario
- [x] 3.3 Los interruptores de completadas y de hábitos, dentro de Vista
- [x] 3.4 Sección **Orden**: agrupar por, ordenar por
- [x] 3.5 Sección **Filtro**: fecha límite, prioridad, etiqueta
- [x] 3.6 Restablecer, al final del panel
- [x] 3.7 **El disparador indica cuándo hay opciones activas distintas de las por defecto.** Sin esto, agrupar esconde estado y la lista se ve distinta sin explicación
- [x] 3.8 Que las opciones sigan persistiéndose igual: `view_preferences` y su esquema no cambian
- [x] 3.9 Por **D24**, verificar que nada quedó inalcanzable al mover controles adentro del panel
- [x] 3.10 Probar el panel en **390px**, que es donde la barra plana ya se envolvía y el problema más molesta
- [x] 3.11 Actualizar los tests de `view-options-bar` que asumen la estructura plana

## 4. Sacar el ícono del título *(paralelo tras el grupo 1)*

- [x] 4.1 `components/projects/sectioned-tasks.tsx` — Bandeja y Proyecto (el ícono de Bandeja en realidad vive en `app/(app)/bandeja/page.tsx`, que la monta; `sectioned-tasks.tsx` no dibuja encabezado propio)
- [x] 4.2 `components/tasks/proximos-view.tsx`
- [x] 4.3 `components/tasks/completed-view.tsx`
- [x] 4.4 `components/projects/project-header.tsx`
- [x] 4.5 Revisar si quedó alguna vista con ícono en el título que no esté en la lista: etiqueta, filtro, hábitos (los tres lo tenían — `label-view.tsx`, `filter-results-view.tsx` y `habits-view.tsx` — sacado en los tres)
- [x] 4.6 **No extraer un encabezado compartido** (decisión D-E): los cuatro encabezados no son iguales entre sí y unificarlos produciría un componente con cinco banderas

## 5. Verificación

- [x] 5.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [x] 5.2 Recorrido completo en el navegador, en escritorio y en 390px — los 390px quedaron confirmados con un viewport real de Playwright, después de que el redimensionado de ventana fallara en cinco tandas seguidas: ningún indicador de atajo se muestra a ese ancho, ni en la hoja lateral móvil ni en ningún botón, y el panel de Formato abre anclado y cómodo
- [x] 5.3 Cada indicador de atajo verificado apretando su tecla
- [x] 5.4 El disparador del panel muestra que hay opciones activas cuando las hay
- [x] 5.5 Ninguna sección conserva el ícono en el título
- [x] 5.6 Las opciones guardadas antes del cambio se siguen leyendo bien
