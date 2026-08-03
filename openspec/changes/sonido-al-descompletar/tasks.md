> **Es chica y toda la dificultad está en escuchar**, no en programar. El código son unas
> pocas líneas; lo que decide si está bien es cómo suenan los dos juntos.
>
> **Ojo con el ajuste**: el delta modifica dos requisitos. Uno es el del disparo y otro es el
> del interruptor, que pasa a cubrir explícitamente los dos sonidos.

## 1. El sonido

- [ ] 1.1 Una variante grave en `lib/completion-sound.ts`. **Misma duración, misma envolvente, mismo volumen**: solo cambia la frecuencia, hacia abajo
- [ ] 1.2 Mantener las constantes con nombre y sus comentarios al día. El dueño las toca a mano para afinar y son lo único que tiene que buscar
- [ ] 1.3 **Un solo evento sonoro** (**D-A**). Nada de dos notas descendentes: sería una secuencia, y ahí empieza a sonar a melodía, que es la frontera con la gamificación que el diseño original trazó

## 2. Dónde se dispara

- [ ] 2.1 La condición que distingue completar de descompletar **ya existe** y se usa para el texto de la tostada de deshacer. Es la misma, leída al revés
- [ ] 2.2 Sigue colgado del callback de éxito de la mutación, **nunca de un efecto que observe los datos**. Eso es lo que mantiene excluidos por construcción deshacer, el tiempo real y las reversiones
- [ ] 2.3 **Desmarcar un hábito sigue sin sonar** (**D-C**). No es una inconsistencia: marcar un hábito no tiene deshacer, y desmarcarlo es la corrección de un error

## 3. El ajuste

- [ ] 3.1 El interruptor que existe pasa a cubrir los dos. **No agregues un segundo**
- [ ] 3.2 Actualizar el texto del ajuste si hoy nombra solo el completar

## 4. Verificación

- [ ] 4.1 `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 4.2 **Completar y descompletar la misma tarea, alternando cinco veces.** Es la prueba que importa: si los dos sonidos no se distinguen sin pensarlo, la nota está mal elegida
- [ ] 4.3 Descompletar diez tareas seguidas: que no canse
- [ ] 4.4 **Desmarcar un hábito no suena**
- [ ] 4.5 **Deshacer no suena**, ni al completar ni al descompletar
- [ ] 4.6 Con dos pestañas: descompletar en una no suena en la otra
- [ ] 4.7 El interruptor apaga los dos
- [ ] 4.8 Dejá anotados los valores elegidos y dónde se cambian: el dueño los va a escuchar y va a querer afinarlos sin buscar
