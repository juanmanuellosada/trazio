> **El grupo 1 es bloqueante**: hasta que la vista no publique su contexto, los diálogos
> globales no tienen de dónde heredarlo. Después los grupos 2, 3 y 4 corren **en
> paralelo**. El grupo 5 es la verificación.
>
> Nadie corre `git stash`, `git reset` ni `git checkout` en una tanda paralela.
>
> **Todo lo que falla en esta tanda falla en silencio.** Una tarea que cae en el proyecto
> equivocado no rompe ningún test. El gate en verde no dice nada acá.

## 1. El contexto de la vista (bloqueante)

- [ ] 1.1 Que la vista actual publique su contexto de alta: proyecto, sección y fecha por defecto. **Por D12 no va a un estado global**; va por contexto de React, como ya se resuelve el detalle de tarea abierto
- [ ] 1.2 **No derivarlo de la ruta** (**D-A**): la sección dentro de un proyecto no está en la URL, y duplicaría lógica que las vistas ya tienen
- [ ] 1.3 Los montajes que **ya** reciben contexto por props no se tocan: funcionan y su precedencia está resuelta
- [ ] 1.4 Publicar desde cada vista: Bandeja, Hoy, Próximos, Proyecto, una sección dentro de un proyecto, Etiqueta y Filtro
- [ ] 1.5 Implementar el eslabón que falta de la cadena: **el proyecto por defecto de las preferencias**, que existe en la base y lo exige el spec del parser, y que el código nunca lee. Va entre el contexto de la vista y Bandeja (**D-B**)

## 2. Los dos diálogos globales *(paralelo tras el grupo 1)*

- [ ] 2.1 **Son el mismo código copiado dos veces** —el del botón del panel lateral y el del atajo—, y el segundo lo admite en un comentario. Resolver la duplicación antes de arreglar el mismo bug dos veces
- [ ] 2.2 Que consuman el contexto publicado en vez de pasar el inbox a mano
- [ ] 2.3 **Que abran plegados** (**D-C**): título y destino, y el resto detrás del control de desplegar. Hoy fuerzan el desplegado; es dejar de forzarlo
- [ ] 2.4 Que el control de desplegar sea obvio: es el pedido explícito del dueño y si no se ve, el modal parece incompleto en vez de plegado
- [ ] 2.5 El alta embebida **sigue abriendo desplegada**, que es lo contrario y es correcto

## 3. Destino, etiquetas y recordatorios *(paralelo tras el grupo 1)*

- [ ] 3.1 Mostrar el destino **también en la variante embebida**, como control que indica y permite cambiar (**D-D**). Esto revierte un requisito que lo prohibía por considerarlo ruido
- [ ] 3.2 Sumar los controles de **etiquetas** y **recordatorios** a las dos variantes, usando **los mismos selectores que el detalle**, no versiones propias
- [ ] 3.3 Que el `@` del parser siga asignando y creando etiquetas, con la precedencia de siempre: lo elegido en el selector gana
- [ ] 3.4 **No agregar adjuntos ni ubicación** (**D-G**). Adjuntos está vetado en tres fuentes y una prohíbe hasta el control deshabilitado; ubicación es geolocalización y no existe en el modelo
- [ ] 3.5 El botón de confirmar conserva el estilo de la aplicación, y la disposición de botones del alta embebida no cambia

## 4. El alta del calendario *(paralelo tras el grupo 1)*

- [ ] 4.1 Reemplazar la implementación paralela por el componente compartido (**D-F**)
- [ ] 4.2 El rango arrastrado entra como fecha y horario de contexto
- [ ] 4.3 Hoy hace **dos mutaciones encadenadas** para poner el horario. Con el componente compartido eso debería ser una sola: verificarlo
- [ ] 4.4 **Si aparece que el componente compartido no sabe expresar "esta hora y esta duración", extenderlo** — no volver a la implementación aparte
- [ ] 4.5 Usa un selector nativo del navegador para el proyecto, que otro spec prohíbe. Se va con el reemplazo

## 5. Verificación

- [ ] 5.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 5.2 **Probar el atajo y el botón del panel lateral por separado.** Eran dos copias: arreglar una y dar por bueno el otro es el error más fácil de cometer acá
- [ ] 5.3 **Abrir el alta global desde cada vista y comprobar dónde cae la tarea**: Bandeja, Hoy, Próximos, un proyecto, una sección dentro de un proyecto, una etiqueta, un filtro. Una tarea en el lugar equivocado es peor que no heredar nada
- [ ] 5.4 En Hoy y en Próximos, que además herede la fecha
- [ ] 5.5 Que elegir un destino distinto le gane a lo heredado
- [ ] 5.6 Con un proyecto por defecto configurado, que se use cuando no hay contexto
- [ ] 5.7 El modal global abre plegado, y el control de desplegar se encuentra sin buscarlo
- [ ] 5.8 Etiquetas y recordatorios funcionan desde el alta, y el `@` sigue funcionando
- [ ] 5.9 Crear una tarea arrastrando en el calendario, con su horario correcto
- [ ] 5.10 En escritorio y en 390px
