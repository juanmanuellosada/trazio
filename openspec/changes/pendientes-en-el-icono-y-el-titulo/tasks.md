## 1. Conteo

- [ ] 1.1 Escribir la consulta de tareas pendientes de hoy para el cliente, con el mismo criterio de "atrasada o vence hoy" que usa la vista Hoy (`lib/tasks/hoy-filter.ts`). NO escribirlo por tercera vez: sacarlo de ahí.
- [ ] 1.2 Reemplazar `fetchTodayPendingReminderCount` por esa consulta en el hook del indicador. Después de esto el hook NO debe tocar la tabla `reminders` ni una sola vez — verificarlo.
- [ ] 1.3 Comentario cruzado entre el conteo del cliente y `lib/tasks/today-count.ts`, igual al que ya existe para `pending-today.ts`: si los criterios se separan, el panel lateral y el ícono dicen números distintos.
- [ ] 1.4 Test de que el número del indicador coincide con el de `getTodayTaskCount` para el mismo conjunto de datos, incluidas las atrasadas.

## 2. Título

- [ ] 2.1 Anteponer `(N) ` al título del documento cuando hay pendientes, y sacarlo cuando no.
- [ ] 2.2 Reaplicarlo después de cada cambio de ruta: el `metadata` del App Router reescribe el título al navegar y se lo lleva puesto (D-B). Probar navegando, no solo al cargar.
- [ ] 2.3 Tests del formato: con pendientes, sin pendientes, y al cambiar de ruta.

## 3. Mudanza

- [ ] 3.1 Mover el hook fuera de `lib/reminders/` a un módulo propio y renombrarlo por lo que cuenta. Actualizar `components/settings/app-badge-sync.tsx`, que sigue montándose en el layout.
- [ ] 3.2 Confirmar que el renombre no dejó referencias muertas ni comentarios que hablen de recordatorios.

## 4. Cierre

- [ ] 4.1 Actualizar `docs/product-spec.md`, sección 9, donde dice que el ícono muestra la cantidad de pendientes: aclarar qué cuenta y sumar el título.
- [ ] 4.2 Anotar en `docs/decisions.md` que el badge deja de contar recordatorios y por qué, y que el título existe porque en Linux el badge no se pinta.
- [ ] 4.3 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 4.4 Verificar en el navegador en Linux: el título tiene que mostrar el número. El badge no se va a ver, y eso es lo esperado — no perseguirlo.
