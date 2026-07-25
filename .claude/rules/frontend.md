---
paths:
  - "app/**"
  - "components/**"
  - "lib/parser/**"
---

# Reglas de frontend

## Server vs Client

Server Components por defecto. `'use client'` solo cuando hay estado, efectos,
eventos del navegador o hooks de librerías cliente — y siempre lo más abajo posible
en el árbol. Si una página entera está marcada como cliente, casi seguro está mal
dividida.

La landing (`app/(marketing)/`) es enteramente servidor. No debe haber un solo
`'use client'` ahí salvo en componentes de interacción puntual.

## Datos

- **Lectura inicial**: Server Component consultando Supabase con el cliente de servidor.
- **Mutaciones e invalidación**: TanStack Query en el cliente.
- **Optimistic updates obligatorios** en completar, editar, mover y reordenar tareas.
  El cambio se ve al instante; si el servidor rechaza, se revierte y se avisa.
- **Realtime**: suscripción por tabla filtrada por `user_id`. Al recibir un evento,
  invalidar la query correspondiente en vez de mutar el caché a mano.

## Estado

No agregar una librería de estado global. Entre Server Components, TanStack Query
y `useState` local alcanza. Si aparece la necesidad de un store global, discutirlo
antes de instalarlo.

## Formularios

React Hook Form + Zod. El mismo esquema de Zod valida en el cliente y en el
servidor — definirlo una vez en `lib/validation/` e importarlo de los dos lados.

## Interacción

- **Drag & drop**: dnd-kit. Toda superficie arrastrable necesita también un camino
  por teclado o menú contextual. Nunca dejar una acción disponible solo por arrastre.
- **Atajos de teclado**: registro centralizado, no listeners sueltos por componente.
  Los atajos no deben dispararse mientras el foco está en un campo de texto, con la
  única excepción de `Ctrl/Cmd+Z`.
- **Optimista siempre visible**: cualquier acción destructiva (eliminar tarea,
  eliminar proyecto) muestra un toast con opción de deshacer.

## Accesibilidad

- Todo control interactivo alcanzable por teclado, con foco visible.
- Los diálogos atrapan el foco y se cierran con `Escape`.
- Contraste mínimo AA. Ojo especial con el rojo `#EC1E2A` sobre fondos claros:
  usar la variante oscura para texto.

## Responsive

Móvil primero. En pantallas chicas: barra de navegación inferior con cuatro accesos
(Bandeja, Hoy, Próximos, Agregar), panel lateral deslizable, y el detalle de tarea a
pantalla completa en vez de panel lateral.

## Diseño

Antes de crear cualquier pantalla nueva o componente visual, consultar la skill
`ui-ux-pro-max`. Las decisiones de estilo, paleta y tipografía salen de ahí, no de
la improvisación. La paleta base está en `docs/product-spec.md`.
