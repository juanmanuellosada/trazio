> **La migración va primero.** Es lo único de esta ronda que toca la base, y si el código sube sin
> ella el usuario abre su proyecto y lo ve plano sin haber pedido nada. Migración, después código.
>
> **Depende de una tanda anterior**: sacar "nada" del agrupador del panel. Si todavía no está en el
> árbol, pará y avisame — esto asume ese estado.
>
> **Lo que puede romperse sin que nadie note** es lo del grupo 3: al aplanar un proyecto, tres
> acciones que hoy viven en el encabezado de cada sección se quedan sin casa.

## 1. La migración (primero)

- [ ] 1.1 Reescribir **una sola vez** las preferencias guardadas con "nada" en claves de proyecto y de Bandeja, pasándolas a "sección"
- [ ] 1.2 **No resolverlo traduciendo al leer** (**D-B**). Eso es el problema que estamos sacando, y dejaría la lista corrida inalcanzable para siempre en un proyecto
- [ ] 1.3 Las preferencias son un documento por pantalla: tocá **solo esa clave**, sin pisar el resto del documento
- [ ] 1.4 La clave de un proyecto lleva su identificador adentro: acertale al patrón, y **no toques** las de etiqueta, filtro, Hoy ni Próximos
- [ ] 1.5 Que sea **idempotente**: correrla dos veces no puede hacer daño
- [ ] 1.6 La política de acceso se escribe en la misma migración si hiciera falta, según la regla del proyecto
- [ ] 1.7 **Aplicarla antes de subir el código.** `git push` no la lleva

## 2. El agrupador de la lista

- [ ] 2.1 "Sin agrupar" es **una lista corrida en todas las pantallas** (**D-A**), sin bloques ni encabezados
- [ ] 2.2 El valor por defecto de Bandeja y Proyecto pasa a ser **sección**. Al abrir se tiene que ver **exactamente igual** que antes
- [ ] 2.3 Sección y fecha se suman a lo que la lista sabe agrupar. Hay un módulo del panel que ya resuelve los dos: **reusalo, no lo dupliques**
- [ ] 2.4 Dónde se ofrece cada uno (**D-D**): sección solo en Bandeja y Proyecto; fecha en todas menos Hoy; el resto en todas
- [ ] 2.5 Un valor no disponible **no se pisa**: la vista se comporta como su valor por defecto y volver lo encuentra intacto. El mecanismo ya existe, extendelo
- [ ] 2.6 **Corregí de paso una inconsistencia**: el spec vigente dice que la lista ofrece los cinco valores y el código ofrece tres. Quedó así hoy

## 3. Lo que se pierde al aplanar (**D-C**)

- [ ] 3.1 Los bloques de sección traen **colapsar, agregar tarea en la sección, y el menú de la sección**. Sin bloques, las tres desaparecen de la lista
- [ ] 3.2 Por **D24**, comprobá **una por una** dónde queda alcanzable cada acción. Si alguna no tiene otra puerta, **pará y avisame** antes de soltar esto
- [ ] 3.3 **Colapsar puede perderse**: es comodidad de lectura, no una acción sobre los datos
- [ ] 3.4 Crear y administrar secciones **no** puede perderse. El panel ya resolvió su mitad: mirá cómo
- [ ] 3.5 **El arrastre**: reordenar dentro de un bloque que no es una sección no tiene dónde persistirse. Apagalo, no lo dejes parecer que funciona

## 4. Hoy no agrupa (**D-E**)

- [ ] 4.1 La lista de Hoy **deja de ofrecer el agrupador**. Su secuencia con eventos intercalados es la vista
- [ ] 4.2 Es una pérdida frente a lo de hoy, que ofrece prioridad y etiqueta. Asumida
- [ ] 4.3 **El panel de Hoy sigue agrupando**: ahí no hay eventos ni secuencia que romper

## 5. Verificación

- [ ] 5.1 `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 5.2 Si tocaste el esquema: migración aplicada y tipos regenerados
- [ ] 5.3 **Un proyecto se ve igual que antes al abrirlo**, con el control diciendo "Sección". Es la prueba de que la migración y el default quedaron bien
- [ ] 5.4 Con una preferencia guardada en "nada" **de antes de la migración**: comprobalo de verdad, sembrando ese estado, no asumiendo
- [ ] 5.5 Elegir "sin agrupar" **después** y que se respete al volver a abrir
- [ ] 5.6 Los cinco agrupadores en un proyecto, y que en una etiqueta no aparezca sección
- [ ] 5.7 **Las tres acciones de sección**, con el proyecto aplanado
- [ ] 5.8 Un proyecto **grande** sin bloques: es lo que se pidió, pero miralo antes de darlo por bueno
- [ ] 5.9 Hoy en lista sin agrupador, Hoy en panel con agrupador
- [ ] 5.10 Escritorio y 390px

## 6. Lo escrito

- [ ] 6.1 `docs/product-spec.md` describe la vista de proyecto con sus bloques de sección
- [ ] 6.2 Una decisión numerada al final de `docs/decisions.md` — **verificá el número, no lo asumas**. Merecen quedar: que "sin agrupar" es una lista corrida en todas partes, y que Hoy deja de agrupar en lista
