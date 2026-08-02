> **Es una sola tanda y no se paraleliza**: el ajuste no se puede agregar antes de que el
> sonido funcione, porque el spec de configuración exige que ninguna sección se muestre
> inerte.
>
> **El gate en verde no prueba lo que importa acá.** Se puede testear que la función se
> llame; no que suene bien ni que no moleste. Eso se escucha.

## 1. El sonido

- [x] 1.1 Módulo nuevo que produce el sonido con la API de audio del navegador. **Sin archivo y sin librería** (**D-A**): `AGENTS.md` prohíbe sumar dependencias sin decisión escrita, y acá no hace falta
- [x] 1.2 **Una sola instancia de audio reutilizada**, creada o reanudada con el primer gesto, no al cargar la página (**D-F**). Crear una por clic es la vía rápida a que el navegador la corte
- [x] 1.3 **Falla en silencio.** Si el navegador bloquea la reproducción, la tarea se completa igual y no aparece ningún error. El sonido nunca está en el camino crítico
- [x] 1.4 **No precachear nada**: la restricción del service worker prohíbe cachear recursos
- [x] 1.5 Que el carácter sea el de **D-C**: un solo evento, bien por debajo de 200 ms, registro medio, sin cola. Nada que escale con la racha ni con la cantidad

## 2. Dónde se dispara

- [x] 2.1 **El sonido va en el callback de éxito de la mutación, jamás en un efecto que observe los datos** (**D-B**). Es lo que hace que deshacer, el tiempo real y las reversiones queden excluidos **sin una sola guarda**. Si se mueve a un efecto, las tres se rompen a la vez
- [x] 2.2 Tareas: en la mutación de actualizar, **antes** del retorno temprano que hay en ese callback, o se pierde el caso donde no había valor anterior en caché
- [x] 2.3 **Condicionar a la forma del cambio**, no a "salió bien una mutación de tarea". El autoguardado de la descripción pasa por la misma mutación cada vez que el usuario deja de tipear: si la condición está mal escrita, suena solo mientras alguien escribe. Ya existe en el código el discriminador que distingue completar de descompletar
- [x] 2.4 Hábitos: agregarle un callback de éxito a la mutación de **marcar**, que hoy no tiene. La de desmarcar **no se toca**
- [x] 2.5 Dejar resuelto el caso del completar en lote, que hoy no existe: si algún día se agrega, tiene que sonar **una vez por lote**
- [x] 2.6 Comprobar que un solo punto cubre las nueve superficies donde se dibuja una fila: lista, tablero, agrupada, secciones, etiqueta, filtro, búsqueda, completado y detalle

## 3. El ajuste

- [x] 3.1 Migración: columna booleana en `user_preferences`, con default en verdadero. Sería **el primer booleano de esa tabla**
- [x] 3.2 **No escribir políticas de RLS nuevas**: son por fila y ya cubren cualquier columna. Confirmarlo leyendo la migración original
- [x] 3.3 Regenerar tipos con `pnpm db:types:local`. **Nunca contra el remoto**
- [x] 3.4 Ampliar el tipo de cambios de preferencias y su lectura. **Ojo con las listas de columnas enumeradas a mano**: en la tanda de secciones había tres, y el síntoma de saltearse una es que el valor se guarda y vuelve vacío
- [x] 3.5 El interruptor va en la sección **General**, siguiendo el patrón de guardado que ya usa esa sección
- [x] 3.6 No hay componente de interruptor reutilizable: hay dos pintados a mano. Decidir si extraer uno o copiar el patrón, y contar qué se eligió

## 4. Verificación

- [x] 4.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [x] 4.2 **Completá diez tareas seguidas y escuchá.** Es la prueba que importa: un sonido que la primera vez es satisfactorio y la décima molesta está mal elegido. Si cansa, ajustá los parámetros y volvé a probar
- [x] 4.3 Completar desde la fila y desde el detalle suenan igual
- [x] 4.4 Marcar un hábito suena
- [x] 4.5 **Desmarcar no suena**, ni una tarea ni un hábito
- [x] 4.6 **Deshacer no suena**
- [x] 4.7 **Escribir una descripción larga en el detalle no suena** — el autoguardado dispara varias veces
- [x] 4.8 **Con dos pestañas abiertas**: completar en una no suena en la otra
- [x] 4.9 Apagar el interruptor silencia todo; encenderlo lo restablece; y sobrevive a recargar
- [x] 4.10 En escritorio y en 390px

## 5. Lo que el dueño tiene que escuchar

- [x] 5.1 Dejar anotados los parámetros del sonido y dónde se cambian, para poder afinarlo sin buscar
- [x] 5.2 Avisar que quedó listo para escuchar: los parámetros exactos son la pregunta abierta del diseño y se resuelven oyéndolo, no por escrito
