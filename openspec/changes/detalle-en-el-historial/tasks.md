> **El grupo 1 es bloqueante y es todo el riesgo de la tanda.** El grupo 2 es chico y sale
> gratis una vez hecho el 1.
>
> **Meter un modal en el historial se rompe fácil y de formas molestas**, y **ninguno de
> esos modos de falla lo ve un test**. El grupo 3 es una lista de los conocidos: hay que
> probarlos uno por uno, a mano.

## 1. El detalle entra al historial (bloqueante)

- [ ] 1.1 Abrir el detalle agrega una entrada; volver atrás la consume y cierra el panel. **La dirección de la página no cambia** (**D-A**)
- [ ] 1.2 **No convertir el detalle en una ruta.** Ya existe la ruta de tarea suelta para "abrir en ventana aparte", y dos direcciones que muestran la misma tarea de dos formas confunden más de lo que resuelven. Además **D28** fija que dentro de la app el detalle es un modal
- [ ] 1.3 La coordinación va donde ya vive el contexto del detalle. **Por D12 no hay estado global**
- [ ] 1.4 **Cerrar con la `X`, con `Escape` y con un clic afuera tiene que retroceder en el historial**, no solo apagar el panel (**D-C**). Si no, cada abrir y cerrar acumula entradas muertas y Atrás deja de hacer nada visible
- [ ] 1.5 Abrir una tarea desde el detalle de otra encadena entradas
- [ ] 1.6 Resolver qué pasa al **recargar con el detalle abierto**: como el detalle no está en la dirección, no puede reabrirse, y la entrada queda huérfana. Es la pregunta abierta del diseño — elegí y contá qué elegiste

## 2. El acceso al padre

- [ ] 2.1 El detalle de una tarea con padre lo muestra y permite abrirlo. **El dato ya viene en la consulta y hoy se ignora**
- [ ] 2.2 Una tarea sin padre no muestra nada
- [ ] 2.3 Solo el **padre directo**, no la cadena de ancestros (**D-D**): las subtareas no tienen límite de anidamiento
- [ ] 2.4 Abrir el padre es una apertura más, así que volver atrás devuelve a la subtarea
- [ ] 2.5 **No romper la disposición de dos columnas** ni los siete atajos del detalle, que funcionan por contenedores con referencia y **cuando se rompen no hacen ruido**

## 3. Los modos de falla, uno por uno

Cada uno se prueba a mano. Ninguno lo detecta un test.

- [ ] 3.1 Volver atrás **dos veces seguidas** no se saltea un paso
- [ ] 3.2 La **flecha de adelante** no reabre algo que el usuario cerró a propósito
- [ ] 3.3 **Recargar con el detalle abierto** deja el historial coherente
- [ ] 3.4 Abrir **tres tareas encadenadas** y volver atrás tres veces recorre las tres en orden
- [ ] 3.5 Abrir y cerrar con la `X` **cinco veces seguidas**, y después volver atrás: tiene que pasar algo visible la primera vez
- [ ] 3.6 Abrir el detalle, ir a la **ruta de tarea suelta** desde el menú, y volver: el historial no queda mezclado
- [ ] 3.7 **Todo lo anterior en el teléfono**, donde el detalle ocupa la pantalla entera y Atrás es el gesto principal. Un error ahí se siente como que la aplicación se cerró sola

## 4. Verificación

- [ ] 4.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 4.2 Si ves muchos tests fallando con `Invalid Chai property`, **no es tu cambio y no reescribas ningún test**: es el árbol de dependencias. `rm -rf node_modules && pnpm install --frozen-lockfile`, y no corras `pnpm install` dentro de un worktree
- [ ] 4.3 Volver atrás desde una subtarea abierta desde su padre lleva al padre
- [ ] 4.4 El acceso al padre funciona y una tarea de primer nivel no lo muestra
- [ ] 4.5 Los siete atajos del detalle siguen funcionando: apretarlos uno por uno
- [ ] 4.6 En escritorio y en 390px
