> **Antes de empezar, hay tareas del dueño del proyecto.** El grupo 0 no lo hace
> ningún agente: son credenciales, variables de entorno y texto legal. La
> implementación puede arrancar sin ellas hasta el grupo 2, pero nada se puede
> probar de punta a punta hasta que estén.
>
> **Cómo se ejecutan las tandas.** El grupo 1 es bloqueante. Los grupos 3 y 4
> corren **en paralelo** tras el 2. El grupo 6 espera al 5. El **grupo 7 es dueño
> único de los archivos compartidos** —barra de opciones, atajos, configuración,
> panel lateral—: ninguna otra tanda los toca.
>
> Nadie corre `git stash`, `git reset` ni `git checkout` en una tanda paralela.
>
> `pnpm lint && pnpm typecheck && pnpm test` en verde no alcanza para dar una tanda
> por terminada: cada una se verifica abriendo el navegador. El arrastre y las
> series recurrentes **solo** se pueden verificar a mano.

## 0. Tareas del dueño del proyecto *(no las hace ningún agente)*

- [ ] 0.1 Crear el proyecto y las credenciales en Google Cloud siguiendo `docs/setup-google-calendar.md`, con el permiso `calendar` completo
- [ ] 0.2 Cargar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI` en local y en Vercel
- [ ] 0.3 Generar la clave de cifrado de 32 bytes y cargarla como variable de servidor, nunca expuesta al navegador
- [ ] 0.4 Actualizar la política de privacidad **antes** de activar la conexión: se empiezan a mandar datos a un tercero (D20, el texto lo provee el dueño)
- [ ] 0.5 Iniciar la verificación de Google apenas la fase funcione en desarrollo, no cuando se quiera lanzar

## 1. Esquema y cifrado (bloqueante)

- [ ] 1.1 Migración `calendar_connections` con su RLS en el mismo archivo: `user_id` como PK, `provider`, `refresh_token`, `enabled_calendar_ids`, `status`
- [ ] 1.2 `lib/calendar/crypto.ts`: cifrar y descifrar con AES-256-GCM, guardando nonce y tag junto al ciphertext
- [ ] 1.3 Tests del cifrado: ida y vuelta, y que un ciphertext manipulado **falla** en vez de devolver basura
- [ ] 1.4 Que la clave se lea solo del lado servidor, y un test que falle si alguien la expone en una variable pública
- [ ] 1.5 Regenerar tipos con `pnpm db:types:local` (nunca `db:types`, que apunta al remoto)
- [ ] 1.6 Tests de RLS de `calendar_connections`: un usuario no ve ni escribe la conexión de otro

## 2. OAuth y cliente de Google *(tras el grupo 1)*

- [ ] 2.1 `app/api/auth/google/route.ts`: inicio del flujo con `access_type=offline` y `prompt=consent`, sin los cuales Google no devuelve refresh token
- [ ] 2.2 `app/api/auth/google/callback/route.ts`: intercambiar el código por tokens, cifrar el refresh token y guardar la conexión
- [ ] 2.3 Protección contra CSRF en el flujo con el parámetro `state`
- [ ] 2.4 `lib/calendar/google-client.ts`: llamadas con `fetch`, sin `googleapis` (decisión D-B)
- [ ] 2.5 Refresco del access token, y marcar la conexión como `needs_reauth` cuando el refresh falla
- [ ] 2.6 Desconectar la cuenta: borra la conexión y **no** toca ningún dato de Trazio
- [ ] 2.7 Listar los calendarios del usuario y guardar cuáles se muestran en `enabled_calendar_ids`
- [ ] 2.8 Tests del cliente con la API de Google simulada: token vencido, refresh fallido, 429 y 500

## 3. Eventos *(paralelo tras el grupo 2)*

- [ ] 3.1 `lib/calendar/events.ts`: leer eventos por rango de los calendarios habilitados
- [ ] 3.2 Caché en memoria del servidor, 60 segundos, por usuario, calendario y rango (decisión D-C)
- [ ] 3.3 Los eventos **no** se guardan en la base: verificar que no hay ninguna tabla ni columna que los persista
- [ ] 3.4 Crear, editar y eliminar eventos
- [ ] 3.5 Las tres formas de aplicar un cambio sobre una serie recurrente: esta ocurrencia, esta y las siguientes, todas — cada una es una llamada distinta
- [ ] 3.6 El diálogo que pregunta cuál aplicar, sin opción por defecto silenciosa, diciendo a cuántas ocurrencias afecta
- [ ] 3.7 Degradación cuando la API falla: se muestran tareas y hábitos y se avisa que los eventos no cargaron. Nunca pantalla en blanco ni spinner infinito
- [ ] 3.8 Verificar que ninguna tarea ni hábito de Trazio se publica en Google
- [ ] 3.9 Tests de las tres formas de editar una serie, con la API simulada

## 4. Administración de calendarios *(paralelo tras el grupo 2)*

- [ ] 4.1 `lib/calendar/calendars.ts`: crear, renombrar, recolorear y eliminar
- [ ] 4.2 Interfaz de administración en la sección Calendarios de Configuración
- [ ] 4.3 El color sale de lo que Google admite, no de la paleta fija de Trazio — anotar la tensión con D19
- [ ] 4.4 Eliminar pide confirmación advirtiendo que **el calendario se borra de la cuenta de Google entera**, no solo de Trazio
- [ ] 4.5 Verificar contra la API real que `calendars.delete` hace exactamente eso antes de escribir esa advertencia

## 5. La grilla del calendario *(tras los grupos 3 y 4)*

- [ ] 5.1 `components/calendar/`: grilla de 24 horas con la fila de todo el día arriba y la línea de la hora actual
- [ ] 5.2 Los cuatro formatos: día, cuatro días, semana y mes
- [ ] 5.3 El layout se adapta por ancho, sin prohibir formatos por dispositivo (decisión D-E)
- [ ] 5.4 Modelo común de bloque para tareas, hábitos y eventos: la grilla no conoce sus dominios (decisión D-F)
- [ ] 5.5 Los tres tipos se distinguen **por forma**, no solo por color
- [ ] 5.6 Solapamientos: dos bloques a la misma hora se reparten el ancho sin taparse
- [ ] 5.7 Bloques de vista previa de repeticiones futuras, acotados al rango visible y no interactivos
- [ ] 5.8 Tests de la disposición: solapamientos, eventos de todo el día, y un evento que cruza la medianoche

## 6. Arrastrar y redimensionar *(tras el grupo 5)*

- [ ] 6.1 Arrastrar un bloque cambia su horario, con ajuste a 15 minutos
- [ ] 6.2 Estirar el borde cambia la duración, con el mismo ajuste
- [ ] 6.3 Cada tipo traduce el movimiento a su propia mutación: evento a Google, tarea a `tasks`, hábito a `habit_schedule_overrides`
- [ ] 6.4 Mover una tarea sin hora a una hora concreta la pasa de `due_date` a `due_at`, que son excluyentes (D9)
- [ ] 6.5 Ampliar `assertAppliesOnDate` en `lib/habits/` para que acepte cualquier día en que el hábito toque, no solo hoy (decisión D-H)
- [ ] 6.6 Chips de hábitos sin horario, programables por arrastre, escribiendo un override de **ese** día
- [ ] 6.7 Arrastrar sobre espacio vacío pregunta si se crea un evento o una tarea
- [ ] 6.8 **Camino alternativo para cada acción**, según la tabla de la decisión D-G: nada disponible solo por arrastre (D24)
- [ ] 6.9 Optimistic update al mover, con reversión y aviso si el servidor falla
- [ ] 6.10 Tests del ajuste a 15 minutos y de la traducción de cada tipo a su mutación

## 7. Integración *(dueño único de los archivos compartidos)*

- [ ] 7.1 `lib/view-options/schema.ts`: sumar `calendario` a `VIEW_SHAPE_OPTIONS` y la opción de formato de calendario
- [ ] 7.2 Revisar el test que hoy verifica que la clave `formato_calendario` se descarta: ahora es válida
- [ ] 7.3 Exponer el control de repeticiones futuras, hoy reservado sin control visible
- [ ] 7.4 Sección Calendarios en Configuración, y actualizar el test que hoy fija que no existe
- [ ] 7.5 El atajo `E` abre el alta de un evento, sin romper la colisión ya resuelta con `E` de etiquetas en el detalle
- [ ] 7.6 Acceso "agregar evento" en el panel lateral, que el spec pide desde la fase 1 y nunca se implementó
- [ ] 7.7 Banner global de reconexión cuando la conexión está en `needs_reauth`, sin usar el rojo de marca (D5)
- [ ] 7.8 Los eventos del día aparecen en Hoy, en el orden del spec: atrasadas, tareas, hábitos, eventos, completadas
- [ ] 7.9 Sacar Google Calendar de la lista de "próximamente" de la landing

## 8. Verificación de la fase

- [ ] 8.1 `pnpm lint && pnpm typecheck && pnpm test` y `pnpm test:rls` en verde
- [ ] 8.2 Criterio: se conecta una cuenta de Google y los eventos aparecen con su color
- [ ] 8.3 Criterio: un evento editado en Trazio se refleja en Google Calendar, y al revés tras refrescar
- [ ] 8.4 Criterio: mover un bloque en el calendario ajusta a 15 minutos y persiste
- [ ] 8.5 Criterio: al vencer el token aparece el aviso de reconexión y reconectar funciona
- [ ] 8.6 Criterio: las tareas de Trazio **no** se publican en Google — verificar mirando Google, no el código
- [ ] 8.7 Las tres formas de editar una serie recurrente, verificadas **a mano** contra un calendario real
- [ ] 8.8 Recorrido manual de los cuatro formatos, en escritorio y en 390px de ancho
- [ ] 8.9 Verificar que ninguna acción quedó disponible solo por arrastre (D24)
- [ ] 8.10 Verificar que el refresh token está cifrado en la base: mirar la fila, no confiar en el código
- [ ] 8.11 Tests e2e de los flujos nuevos, con la API de Google simulada
- [ ] 8.12 Marcar los criterios de aceptación de la fase 4 en `docs/roadmap.md`
