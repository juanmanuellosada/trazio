> **El grupo 1 es bloqueante** y es la primera migración después de varias tandas de
> solo interfaz. El grupo 2 es la interfaz. El grupo 3 es la verificación.
>
> **El error más probable de esta tanda no es la migración: son las listas de columnas
> enumeradas a mano.** El síntoma es que la descripción se guarda y vuelve vacía.

## 1. El esquema (bloqueante)

- [x] 1.1 Migración nueva: `description text` en `sections`, nullable y sin default, copiando el patrón de `projects.description`
- [x] 1.2 **No escribir políticas de RLS nuevas.** Las de `sections` son por fila y ya cubren la columna; el `grant` no enumera columnas. Confirmarlo leyendo la migración original en vez de asumirlo
- [x] 1.3 Aplicar en local y regenerar tipos con `pnpm db:types:local`. **Nunca contra el remoto**
- [x] 1.4 `lib/sections/use-sections.ts`: la consulta tiene una **lista literal de columnas**, no un `select *`. Sumar la nueva
- [x] 1.5 `lib/sections/mutations.ts`: el `select` del insert repite esa lista. Sumarla también. **Y ampliar `SectionPatch`**, que hoy solo admite nombre y colapsado
- [x] 1.6 `lib/validation/sections.ts`: sumar el campo al esquema, y corregir el comentario que dice "solo tiene nombre"
- [x] 1.7 Comprobar de punta a punta que la descripción **se guarda y vuelve**: crear una sección con descripción, recargar, y verificar que sigue ahí. Es exactamente lo que fallaría si quedó una lista sin actualizar

## 2. La interfaz

- [x] 2.1 `components/sections/section-list.tsx`: el alta pasa a formulario de dos campos, con React Hook Form y Zod (**D13** y la regla de frontend). Hoy es `useState` a pelo
- [x] 2.2 **Sacar el `max-w-64` del campo de nombre.** Es lo único que limita el ancho: la columna ya es `w-full max-w-content mx-auto` por D39. No tocar el contenedor ni `--container-content`
- [x] 2.3 Confirmar y cancelar explícitos. **Perder el foco ya no guarda** (**D-B**): pasar del nombre a la descripción es un `blur` y guardaría la sección a medio escribir
- [x] 2.4 `Escape` sigue cancelando. Decidir mirándolo si `Enter` en el nombre confirma o pasa al segundo campo — es la pregunta abierta del diseño
- [x] 2.5 Editar una sección existente pasa a poder cambiar los dos campos, no solo el nombre
- [x] 2.6 Mostrar la descripción debajo del nombre en el encabezado, con menos peso visual, como ya hace la fila de una tarea. **Si está vacía, no dibujar nada**
- [x] 2.7 **En vista tablero no se muestra** (**D-E**): la columna es angosta y su encabezado es de una línea
- [x] 2.8 Actualizar `docs/data-model.md`, `docs/product-spec.md` y los tests de secciones

## 3. Verificación

- [x] 3.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [x] 3.2 **El atajo de agregar sección sigue funcionando.** Funciona buscando el botón por su texto literal, así que si el rediseño cambió ese texto se rompe **en silencio**: no falla, no encuentra nada. Verificarlo apretando la tecla
- [x] 3.3 Crear una sección con los dos campos, y otra con solo el nombre
- [x] 3.4 Recargar y comprobar que la descripción sobrevivió
- [x] 3.5 Editar la descripción de una sección existente
- [x] 3.6 Una sección sin descripción no deja un hueco en su encabezado
- [x] 3.7 En vista tablero la columna sigue mostrando solo el nombre
- [x] 3.8 Colapsar, reordenar y eliminar siguen funcionando: el archivo concentra las tres cosas y es fácil romper una tocando otra
- [x] 3.9 En escritorio y en 390px
