> **El grupo 1 es el riesgoso** y no por difícil: `Ctrl`+clic puede ser el clic derecho según
> la plataforma, y en este proyecto el clic derecho **acaba de** empezar a abrir el menú de la
> tarea, sobre el mismo elemento.
>
> **La selección múltiple ya funciona**: casilleros, rango con `Shift`, salida con `Escape` y
> barra de acciones. Esto suma, no rehace.

## 1. `Ctrl`+clic

- [ ] 1.1 `Ctrl`+clic sobre una tarea la selecciona y entra al modo. **Hoy no hay ni una lectura de `Ctrl` o `Cmd` en todo el código**: `Shift` es el único modificador implementado
- [ ] 1.2 Sobre una ya seleccionada, la deselecciona
- [ ] 1.3 **El casillero sigue funcionando y `Shift` sigue haciendo rango** (**D-A**). En táctil no hay modificadores: sin el casillero no habría forma de seleccionar
- [ ] 1.4 **Probar el cruce con el clic derecho en las plataformas que importen** (**D-B**). En algunas `Ctrl`+clic **es** el clic derecho, y el resultado sería que intentar seleccionar abre un menú. No lo deduzcas de la documentación
- [ ] 1.5 Si colisionan, la salida **no es elegir uno**: es usar en esa plataforma el modificador que ahí corresponda
- [ ] 1.6 Que `Ctrl`+clic **no abra el detalle**, que es lo que hace hoy

## 2. Etiquetas en lote

- [ ] 2.1 Mutación nueva: aplicar etiquetas a varias tareas
- [ ] 2.2 **Suma, no reemplaza** (**D-C**). Las etiquetas de una tarea se guardan por reemplazo del conjunto completo; llevar eso al lote **borraría las etiquetas que cada tarea ya tenía**. Al editar diez el usuario no ve lo que cada una tiene
- [ ] 2.3 **Que la interfaz diga que suma.** Es una diferencia deliberada con editar una sola, y alguien la va a notar
- [ ] 2.4 Reutilizar el selector de etiquetas que ya existe, no escribir uno
- [ ] 2.5 Quitar una etiqueta de muchas tareas **no entra**: es otra operación y no se pidió

## 3. El menú de más

- [ ] 3.1 La barra ya tiene siete controles y le sumamos uno. En 390px no entra
- [ ] 3.2 Decidir qué va detrás del menú **mirando la barra llena**, no antes. Es la pregunta abierta del diseño
- [ ] 3.3 **Eliminar no puede quedar escondido ni ser lo más accesible**: es destructivo sobre varias tareas a la vez

## 4. Verificación

- [ ] 4.1 `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 4.2 Si ves muchos tests fallando con `Invalid Chai property`, **no es tu cambio y no reescribas ningún test**: es el árbol de dependencias. `rm -rf node_modules && pnpm install --frozen-lockfile`, y no corras `pnpm install` dentro de un worktree
- [ ] 4.3 `Ctrl`+clic selecciona, y sobre una ya seleccionada deselecciona
- [ ] 4.4 **`Ctrl`+clic no abre el menú de acciones ni el detalle**
- [ ] 4.5 El casillero y el rango con `Shift` siguen funcionando
- [ ] 4.6 **Etiquetar tres tareas, una con etiquetas previas, y comprobar que no se le borraron**
- [ ] 4.7 La barra completa en **390px**: todo alcanzable
- [ ] 4.8 El modo de selección sigue andando en las seis pantallas donde el spec lo exige
- [ ] 4.9 `Escape` sigue saliendo del modo, y salir al llegar a cero sigue igual
