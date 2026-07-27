"use client";

import { useEffect, useId, useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";

type EmojiEntry = { unicode: string; label: string; tags: string[]; hexcode: string };
type EmojiCategory = { key: string; label: string; order: number; emojis: EmojiEntry[] };

// "component" (tonos de piel, variantes de pelo) son piezas que modifican
// otro emoji, no íconos con sentido propio: se excluyen del selector.
const EXCLUDED_GROUP_KEY = "component";

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

/**
 * Carga los datos de emojis (D31): recién al abrirse el selector, nunca en
 * el arranque de la app — son miles de entradas, y cargarlas siempre
 * empeoraría el arranque para una función que se usa a veces. Solo el
 * locale español de `emojibase-data` (D31: es la única fuente con nombres y
 * palabras de búsqueda traducidos).
 */
async function loadEmojiCategories(): Promise<EmojiCategory[]> {
  const [{ default: emojis }, { default: messages }, { default: groupMeta }] = await Promise.all([
    import("emojibase-data/es/compact.json"),
    import("emojibase-data/es/messages.json"),
    import("emojibase-data/meta/groups.json"),
  ]);

  const categoriesByKey = new Map<string, EmojiCategory>();
  for (const group of messages.groups) {
    if (group.key === EXCLUDED_GROUP_KEY) continue;
    categoriesByKey.set(group.key, { key: group.key, label: capitalize(group.message), order: group.order, emojis: [] });
  }

  for (const emoji of emojis) {
    if (emoji.group === undefined) continue;
    const groupKey = groupMeta.groups[String(emoji.group)];
    const category = groupKey ? categoriesByKey.get(groupKey) : undefined;
    if (!category) continue;
    category.emojis.push({
      unicode: emoji.unicode,
      label: emoji.label,
      tags: emoji.tags ?? [],
      hexcode: emoji.hexcode,
    });
  }

  return Array.from(categoriesByKey.values())
    .filter((category) => category.emojis.length > 0)
    .sort((a, b) => a.order - b.order);
}

/**
 * Selector de ícono de proyecto (bloque 8.4/8.7): todos los emojis,
 * categorizados y buscables por nombre en español, en vez del campo de
 * bloque 6 donde el emoji se escribía a mano.
 */
export function EmojiPicker({
  value,
  onChange,
  error,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<EmojiCategory[] | null>(null);
  const labelId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!open || categories) return;
    let cancelled = false;
    loadEmojiCategories().then((data) => {
      if (!cancelled) setCategories(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, categories]);

  return (
    <div className="space-y-1.5">
      <Label id={labelId}>Ícono (opcional)</Label>
      <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
        <PopoverTrigger
          aria-labelledby={labelId}
          aria-describedby={error ? errorId : undefined}
          className="flex size-11 items-center justify-center rounded-lg border border-input bg-transparent text-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
        >
          {value ? <span aria-hidden>{value}</span> : <Smile aria-hidden className="size-4 text-text-secondary" />}
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0">
          <Command>
            <CommandInput placeholder="Buscá un emoji…" aria-label="Buscar emoji" />
            <CommandList>
              {!categories ? (
                <p className="px-2 py-6 text-center text-sm text-text-secondary">Cargando emojis…</p>
              ) : (
                <>
                  <CommandEmpty>No encontramos ningún emoji con ese término.</CommandEmpty>
                  {categories.map((category) => (
                    <CommandGroup key={category.key} heading={category.label}>
                      <div className="grid grid-cols-8 gap-0.5 p-1">
                        {category.emojis.map((emoji) => (
                          <CommandItem
                            key={emoji.hexcode}
                            value={`${emoji.label} ${emoji.tags.join(" ")}`}
                            aria-label={emoji.label}
                            onSelect={() => {
                              onChange(emoji.unicode);
                              setOpen(false);
                            }}
                            className="flex size-8 items-center justify-center rounded-md p-0 text-base leading-none [&>svg]:hidden"
                          >
                            {emoji.unicode}
                          </CommandItem>
                        ))}
                      </div>
                    </CommandGroup>
                  ))}
                </>
              )}
            </CommandList>
          </Command>
          {value ? (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-text-secondary outline-none hover:bg-surface focus-visible:bg-surface"
              >
                Quitar ícono
              </button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
