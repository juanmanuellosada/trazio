> **Cómo se ejecutan estas tandas.** El grupo 1 es bloqueante: el ítem del panel
> lateral lleva indicador de atajo, y el indicador se alimenta del binding real, así
> que la tecla tiene que existir antes. Después los grupos 2 y 3 corren **en
> paralelo**: no comparten archivos. El grupo 4 es la verificación.
>
> Nadie corre `git stash`, `git reset` ni `git checkout` en una tanda paralela.
>
> **Esta tanda es de navegación y de interfaz.** `pnpm lint && pnpm typecheck &&
> pnpm test` en verde no prueba nada acá: los tres problemas que resuelve —no se
> encuentra, desaparece con cero etiquetas, no se puede renombrar desde su página—
> son de recorrido, y se verifican abriendo el navegador.
>
> **Esta propuesta asume `interfaz-descubrible` ya archivada**, porque su delta deja
> el acorde en `G H` y `G P` y aporta el componente de indicador de atajo.

## 1. La tecla `G E` (bloqueante)

- [x] 1.1 `lib/shortcuts/chord.ts`: sumar `e` al `CHORD_MAP` con destino Etiquetas
- [x] 1.2 Verificar que `e` no colisiona con ningún binding existente, ni global ni por pantalla ni del detalle de tarea. La `E` suelta abre el alta de evento y **no** es colisión —el acorde captura la segunda tecla— pero eso hay que comprobarlo apretándolo, no razonarlo
- [x] 1.3 Confirmar que `CHORD_KEY_BY_DESTINATION` deriva la entrada nueva sola. Si hubiera que escribir la tecla a mano en algún lado, va con un test que verifique que coincide con el binding (decisión **D-C** de `interfaz-descubrible`)
- [x] 1.4 Tests de `lib/shortcuts/chord.test.ts` y `components/shortcuts/shortcut-provider.test.tsx`
- [x] 1.5 Sumar `G E` a la sección 10 de `docs/product-spec.md`

## 2. El acceso en el panel lateral *(paralelo tras el grupo 1)*

- [x] 2.1 `components/layout/sidebar-content.tsx`: ítem "Etiquetas" **debajo de Próximos**, con destino `/etiquetas` y su indicador de atajo, igual que los otros cinco
- [x] 2.2 `components/layout/label-filter-lists.tsx`: sacar el `return null` que esconde el acceso cuando no quedan etiquetas no favoritas. **Es lo que hoy incumple el spec vigente** y lo que deja a un usuario nuevo sin puerta
- [x] 2.3 Resolver el anidamiento de la lista colapsable respecto del ítem nuevo — colgando de él o como hermana. Es la pregunta abierta del `design.md`: elegí y miralo en el navegador, no lo decidas de memoria
- [x] 2.4 Que hacer clic en el ítem lleve a administrar, y en una etiqueta de la lista a sus tareas. **Son dos destinos parecidos en el mismo bloque**: si al usarlo se confunden, decilo
- [x] 2.5 `components/layout/account-menu.tsx`: sacar la entrada "Etiquetas". Dejar la de "Filtros" — tiene el mismo problema y merece su propia propuesta, no un arrastre
- [x] 2.6 Actualizar la descripción del panel lateral en `docs/product-spec.md`, que enumera los accesos
- [x] 2.7 Tests del panel lateral, incluido **el caso de cero etiquetas**, que es el que hoy falla
- [x] 2.8 Probar en el navegador con una cuenta sin ninguna etiqueta, y con una que las tenga todas favoritas

## 3. Acciones en la página de la etiqueta *(paralelo tras el grupo 1)*

- [x] 3.1 `components/labels/label-view.tsx`: menú de acciones en el encabezado, siguiendo el patrón de `components/projects/project-header.tsx`, que ya tiene exactamente esto
- [x] 3.2 Renombrar y recolorear **reutilizando `label-form-dialog.tsx`**. No escribir un diálogo nuevo
- [x] 3.3 Eliminar **reutilizando `delete-label-dialog.tsx`**, que ya cumple el requisito de confirmación previa
- [x] 3.4 Marcar y desmarcar favorita
- [x] 3.5 Al eliminar la etiqueta que se está mirando, navegar a `/etiquetas`: la pantalla quedaría apuntando a algo que ya no existe. Resuelto sin tocar `delete-label-dialog.tsx`: `label` pasa a derivarse de `useLabels()` (mismo patrón que `ProjectView`/`useProjects()`), así que cuando la etiqueta deja de estar en esa lista —por esta eliminación o por cualquier otra vía— un `useEffect` navega a `/etiquetas`. Esto también resolvió de paso un bug que encontré: la estrella y el título usaban el prop estático del Server Component y no reflejaban el cambio en vivo al marcar favorita o renombrar desde esta misma página
- [x] 3.6 Que el encabezado siga sin ícono ni punto de color, como lo dejó `interfaz-descubrible`
- [x] 3.7 Tests, incluido el redirect al eliminar

## 4. Verificación

- [x] 4.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [x] 4.2 `G E` navega a Etiquetas, y la `E` suelta sigue abriendo el alta de evento
- [x] 4.3 El indicador del ítem nuevo anuncia la tecla que realmente funciona
- [x] 4.4 **Con cero etiquetas el acceso se ve**, y desde ahí se puede crear la primera
- [x] 4.5 Renombrar, recolorear, favorita y eliminar funcionan desde la página de la etiqueta
- [x] 4.6 Eliminar desde la página de la etiqueta no deja la aplicación en una página que ya no existe
- [x] 4.7 "Etiquetas" ya no está en el menú de cuenta, y no quedó ningún camino roto hacia `/etiquetas`
- [x] 4.8 Recorrido en escritorio y en 390px
