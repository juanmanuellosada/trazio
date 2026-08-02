> **El grupo 4 es un ítem de menú y no depende de nada**: se puede hacer primero y sacárselo
> de encima.
>
> **La librería de paleta ya está instalada** y se usa en cuatro desplegables con búsqueda.
> Da gratis el filtrado, las flechas, el Enter, los grupos y el estado vacío. **Leela antes de
> escribir.**

## 1. De pantalla a paleta

- [x] 1.1 El buscador se abre por encima de la vista actual, y cerrarlo devuelve exactamente a donde estaba
- [x] 1.2 El atajo `S` la abre en vez de navegar. El requisito ya dice "abrir", así que esto **no cambia el spec de atajos**
- [x] 1.3 **La ruta `/buscar` no se elimina** (**D-A**): puede estar en un historial o en un favorito. Decidí qué hace cuando alguien entra directo y contá qué elegiste
- [x] 1.4 **No pierdas los estados que ya tiene la pantalla**: hay cuatro, con dos textos distintos según se haya escrito cero o un carácter. Es lo más fácil de tirar al pasar a la paleta

## 2. Navegación y grupos

- [x] 2.1 Flechas para moverse, Enter para elegir, `Escape` para cerrar. **Hoy no hay nada de eso**: se recorre con Tab
- [x] 2.2 Tres grupos: **visto recientemente**, **resultados** e **ir a**
- [x] 2.3 **Con el campo vacío la paleta no puede quedar en blanco**: ahí están los recientes y los destinos
- [x] 2.4 **El mínimo de caracteres rige solo para los resultados de tareas.** "Ir a Hoy" tiene que poder filtrarse con una letra
- [x] 2.5 Los destinos de navegación y sus indicadores de atajo ya existen para el panel lateral: **reutilizalos**
- [x] 2.6 **Los atajos que se muestran vienen del binding real, no de una lista escrita a mano.** Ya pasó una vez en este proyecto que un indicador anunciara una tecla que en esa pantalla no hacía nada
- [x] 2.7 **Comprobar que escribir en la paleta no dispara atajos globales.** Escribir "hoy" no puede navegar a Hoy

## 3. Los recientes

- [x] 3.1 Es lo único que no existe. Decidir **qué cuenta como visto** —abrir el detalle parece lo obvio— y contarlo
- [x] 3.2 Guardarlo en el navegador (**D-C**): es lo más simple y "lo último que miré" es propio de cada dispositivo, no algo que convenga compartir
- [x] 3.3 **Una tarea reciente que se borró no puede quedar como una opción que al tocarla no hace nada**

## 4. El menú del detalle *(independiente)*

- [x] 4.1 Sumar "abrir completo en esta ventana", que navega a la ruta propia de la tarea. **La ruta ya existe**
- [x] 4.2 "Abrir en ventana aparte" **se queda**: son cosas distintas y las dos se usan

## 5. Verificación

- [x] 5.1 `pnpm lint && pnpm typecheck && pnpm test`
- [x] 5.2 Si ves muchos tests fallando con `Invalid Chai property`, **no es tu cambio y no reescribas ningún test**: es el árbol de dependencias. `rm -rf node_modules && pnpm install --frozen-lockfile`, y no corras `pnpm install` dentro de un worktree
- [x] 5.3 Abrir la paleta desde un proyecto, cerrarla, y comprobar que seguís en ese proyecto
- [x] 5.4 Buscar, bajar con las flechas y abrir con Enter, **sin tocar el mouse**
- [x] 5.5 Escribir "hoy" y comprobar que **no navega** a Hoy
- [x] 5.6 Con el campo vacío se ven recientes y destinos
- [x] 5.7 Borrar una tarea que estaba entre las recientes y comprobar qué pasa
- [x] 5.8 **El comportamiento de búsqueda no cambió**: mínimo de caracteres, tope de resultados, orden, acentos, y que siga siendo literal sin corregir tipeos
- [x] 5.9 Los dos ítems del menú del detalle: uno navega, el otro abre ventana
- [x] 5.10 En escritorio y en 390px
