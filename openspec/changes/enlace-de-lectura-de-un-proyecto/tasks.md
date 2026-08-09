## 1. Esquema y función

- [x] 1.1 Migración: columna de token en `projects`, nullable, con índice único. Generado con `gen_random_bytes(32)` normalizado a base64url (D-A).
- [x] 1.2 Función `security definer` que recibe **solo el token**, con `search_path` acotado, `revoke all from public` y `grant execute` únicamente al rol anónimo (D-B).
- [x] 1.3 Enumerar cada columna a mano. NUNCA `select *`: una columna futura se publicaría sola.
- [x] 1.4 Token inexistente y token revocado devuelven lo mismo.
- [x] 1.5 Mutaciones de generar, regenerar y desactivar, acotadas al dueño por RLS.
- [x] 1.6 `pnpm db:types`.

## 2. Tests de la función, que es la superficie sensible

- [x] 2.1 Test de que NO acepta un identificador de proyecto en lugar de un token.
- [x] 2.2 Test de que no devuelve comentarios, recordatorios, etiquetas ni datos de la cuenta.
- [x] 2.3 Test que falle si la función pasa a devolver más columnas de las declaradas — es el que protege contra una fuga futura.
- [x] 2.4 Test de que un token revocado y uno inexistente son indistinguibles.
- [x] 2.5 Test de que una cuenta autenticada cualquiera no puede ejecutar la función.
- [x] 2.6 Test de regenerar: el token viejo deja de servir.

## 3. Vista pública

- [x] 3.1 Ruta fuera de `app/(app)/`, sin el layout privado (D-F). No puede consultar perfil, preferencias ni árbol de proyectos.
- [x] 3.2 `Referrer-Policy: no-referrer` y `rel="noopener noreferrer"` en todo enlace saliente (D-C). Es la fuga menos obvia: el token va en la URL y la descripción admite enlaces.
- [x] 3.3 `noindex` como cabecera y como meta (D-D).
- [x] 3.4 Renderizar la descripción desde el JSONB de Tiptap. NUNCA introducir un `dangerouslySetInnerHTML` en este camino (D-G).
- [x] 3.5 Sin ningún control de escritura, ni siquiera deshabilitado (spec "no permite ninguna escritura").
- [x] 3.6 Estado para token inválido o desactivado, sin revelar si alguna vez existió.

## 4. Interfaz del dueño

- [x] 4.1 Compartir en el menú del proyecto: generar, copiar, regenerar, desactivar. Nunca en la Bandeja.
- [x] 4.2 Advertir al generar que cualquiera con el enlace puede ver el proyecto. Que se lea, no que esté.
- [x] 4.3 Indicación visible en un proyecto compartido.
- [x] 4.4 Definir el tratamiento visual con la skill `ui-ux-pro-max` antes de escribir el CSS.

## 5. Cierre

- [x] 5.1 Anotar en `docs/decisions.md` que se acota la decisión de "sin compartir": sigue sin cuentas invitadas, edición ajena ni asignación, y se agrega publicar una vista de solo lectura.
- [x] 5.2 Actualizar `docs/product-spec.md`: la sección 13 y las acciones de un proyecto.
- [x] 5.3 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [x] 5.4 Verificar en el navegador: abrir el enlace en una ventana privada, comprobar que no pide sesión, que no hay controles de escritura, y que el `Referer` no viaja al tocar un enlace de una descripción.
