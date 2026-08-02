> **El grupo 1 es bloqueante** y toca el modelo. El grupo 2 es donde está el riesgo real: la
> función que arma la regla alimenta la generación de la siguiente ocurrencia, que hoy
> funciona.
>
> **Esta tanda va antes que la de eventos**, porque le deja el diálogo de repetición
> personalizada.
>
> **Lo de "finaliza" ya está entero** —modelo, editor y corte de serie—, incluida una opción
> de más que el dueño no pidió. **No la saques**: nadie pidió sacarla y funciona.

## 1. El ancla elegible (bloqueante)

- [x] 1.1 Columna nueva en `tasks` para el ancla, **que puede quedar vacía**
- [x] 1.2 **No la llenes al migrar** (**D-A**). Vacía significa "deducir como siempre"; llenarla congelaría lo que hoy es dinámico
- [x] 1.3 La función que deriva el ancla pasa a mirar primero la columna, y solo deduce si está vacía
- [x] 1.4 **No escribas políticas de RLS nuevas**: son por fila. Confirmalo leyendo la migración original
- [x] 1.5 Regenerá tipos con `pnpm db:types:local`, **nunca contra el remoto**. Y buscá **todas** las listas de columnas enumeradas a mano: en una tanda de hoy había tres, y el síntoma de saltearse una es que el valor se guarda y vuelve vacío
- [x] 1.6 **Comprobar con tareas recurrentes reales que nada cambió** para las que ya existían

## 2. La regla completa *(el riesgo)*

- [x] 2.1 La función que arma la regla pasa a generar también los días de la semana y el día del mes, no solo frecuencia e intervalo
- [x] 2.2 **Que editar deje de destruir lo que trajo el lenguaje natural.** Hoy, si una tarea tiene "cada lunes" y tocás la frecuencia, el lunes se borra. Es una pérdida silenciosa y arreglarla importa tanto como lo nuevo
- [x] 2.3 **Probar el ciclo completo**: crear una recurrente, completarla, y ver dónde cae la siguiente. El editor va a producir formas de regla que antes solo producía el parser, y la generación de la ocurrencia depende de esa forma
- [x] 2.4 Probar las combinaciones que antes eran imposibles: "cada 3 días desde el vencimiento" y "cada lunes desde el completado". Son legítimas y nadie las probó nunca

## 3. El editor

- [x] 3.1 Pasarle la fecha de la tarea, que hoy **no recibe**
- [x] 3.2 Opciones rápidas derivadas de esa fecha: cada día, cada semana el día que sea, cada día laborable, cada mes el número que sea, cada año la fecha que sea
- [x] 3.3 **Una tarea sin fecha no ofrece las opciones que dependen de ella** (**D-C**), mismo criterio que se usó en recordatorios
- [x] 3.4 Decidir si los cuatro controles sueltos de hoy se quedan además de las opciones rápidas, o si todo lo que no sea rápido se va al diálogo. Es la pregunta abierta del diseño: elegí mirándolo y contá qué elegiste

## 4. El diálogo personalizado

- [x] 4.1 Según qué fecha cuenta, cada cuántas unidades, qué días de la semana, y cuándo finaliza
- [x] 4.2 **Escribilo pensando en que lo va a usar también el alta de eventos**, y que su primera pregunta —según qué fecha cuenta— **pueda ocultarse**: en un evento no significa nada
- [x] 4.3 **Si al escribirlo te aparecen más de una o dos banderas** para distinguir los dos casos, pará y avisame: sería señal de que no eran la misma pregunta

## 5. Verificación

- [x] 5.1 `pnpm lint && pnpm typecheck && pnpm test`
- [x] 5.2 Si ves muchos tests fallando con `Invalid Chai property`, **no es tu cambio y no reescribas ningún test**: es el árbol de dependencias. `rm -rf node_modules && pnpm install --frozen-lockfile`, y no corras `pnpm install` dentro de un worktree
- [x] 5.3 Las opciones nombran la fecha de la tarea, y cambian si la fecha cambia
- [x] 5.4 Una tarea sin fecha no ofrece las derivadas
- [x] 5.5 **Cambiar la frecuencia de una tarea con "cada lunes" no le borra el lunes**
- [x] 5.6 El diálogo personalizado guarda lo que se eligió, y al reabrirlo muestra lo guardado
- [x] 5.7 Completar una recurrente de cada tipo y comprobar dónde cae la siguiente
- [x] 5.8 En escritorio y en 390px
