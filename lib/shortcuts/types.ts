/**
 * Un atajo de una sola tecla (con modificadores), sin contar el acorde `G`
 * (bloque 7.1, D-G): `ctrl` acepta tanto `Ctrl` como `Cmd` (`metaKey`), igual
 * que ya hace `lib/undo/shortcut.ts` para `Ctrl/Cmd+Z` — coherencia entre
 * Windows/Linux y Mac en toda la app, no solo en deshacer.
 */
export type ShortcutCombo = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type ShortcutBinding = {
  combo: ShortcutCombo;
  handler: (event: KeyboardEvent) => void;
};

/**
 * Un contexto de la pila (bloque 7.1): la pantalla o el modal que lo
 * registra guarda una referencia mutable (`current`), así que puede
 * actualizar sus bindings en cada render sin desregistrarse y volver a
 * registrarse — el orden de la pila (quién es "más específico") lo fija el
 * momento del `push`, no cada actualización de bindings.
 */
export type ShortcutScope = {
  current: ShortcutBinding[];
};
