"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { normalize } from "@/lib/parser/normalize";

type EmojiEntry = { unicode: string; label: string; tags: string[]; hexcode: string };
type EmojiCategory = { key: string; label: string; order: number; emojis: EmojiEntry[] };
type SearchIndex = { labelWords: string[]; tagWords: string[] };

// "component" (tonos de piel, variantes de pelo) son piezas que modifican
// otro emoji, no íconos con sentido propio: se excluyen del selector.
const EXCLUDED_GROUP_KEY = "component";

// Las palabras de las tags (sinónimos) valen menos que las del nombre
// propio del emoji: si algo matchea por nombre, es más relevante.
const TAG_WORD_WEIGHT = 0.75;

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

function sharedPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Puntaje de una palabra de búsqueda contra una palabra del emoji (ya
 * normalizadas, sin tildes). Coincidencia exacta > empieza con la búsqueda
 * > comparten un inicio largo (cubre variantes como "trabajo"/"trabajador",
 * donde ninguna es prefijo exacta de la otra) > aparece en el medio. El
 * principio de la palabra pesa más que el medio a propósito.
 */
function wordScore(word: string, searchWord: string): number {
  if (word === searchWord) return 4;
  if (word.startsWith(searchWord)) return 3;
  const shared = sharedPrefixLength(searchWord, word);
  if (shared >= 4 && shared / searchWord.length >= 0.75) return 2;
  if (word.includes(searchWord)) return 1;
  return 0;
}

function buildSearchIndex(label: string, tags: string[]): SearchIndex {
  return {
    labelWords: normalize(label).split(/\s+/).filter(Boolean),
    tagWords: tags.flatMap((tag) => normalize(tag).split(/\s+/).filter(Boolean)),
  };
}

/**
 * Filtro propio del selector (en vez del filtro difuso por defecto de
 * `cmdk`): con ~1900 entradas, ese filtro genérico matchea subsecuencias de
 * letras en cualquier parte del nombre + tags concatenados, sin distinguir
 * acentos, y devuelve resultados sin relación con lo escrito. Acá cada
 * palabra de la búsqueda tiene que encontrar algo (si una no matchea nada,
 * el emoji se descarta) y el puntaje total ordena el resto.
 */
function scoreAgainstIndex(searchWords: string[], index: SearchIndex): number {
  let total = 0;
  for (const searchWord of searchWords) {
    let best = 0;
    for (const word of index.labelWords) best = Math.max(best, wordScore(word, searchWord));
    for (const word of index.tagWords) best = Math.max(best, wordScore(word, searchWord) * TAG_WORD_WEIGHT);
    if (best === 0) return 0;
    total += best;
  }
  return total;
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

  // Se precalcula una sola vez por carga de datos (no en cada tecla): con
  // ~1900 entradas, recalcular esto en cada filtrado sería el costo caro.
  const searchIndexByHexcode = useMemo(() => {
    const index = new Map<string, SearchIndex>();
    if (!categories) return index;
    for (const category of categories) {
      for (const emoji of category.emojis) {
        index.set(emoji.hexcode, buildSearchIndex(emoji.label, emoji.tags));
      }
    }
    return index;
  }, [categories]);

  const filterEmoji = useMemo(
    () => (hexcode: string, search: string) => {
      const index = searchIndexByHexcode.get(hexcode);
      if (!index) return 0;
      const searchWords = normalize(search).split(/\s+/).filter(Boolean);
      if (searchWords.length === 0) return 1;
      return scoreAgainstIndex(searchWords, index);
    },
    [searchIndexByHexcode],
  );

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
          <Command filter={filterEmoji}>
            <CommandInput placeholder="Buscá un emoji…" aria-label="Buscar emoji" />
            <CommandList>
              {!categories ? (
                <p className="px-2 py-6 text-center text-sm text-text-secondary">Cargando emojis…</p>
              ) : (
                <>
                  <CommandEmpty>No encontramos ningún emoji con ese término.</CommandEmpty>
                  {categories.map((category) => (
                    <CommandGroup
                      key={category.key}
                      heading={category.label}
                      className="**:[[cmdk-group-items]]:grid **:[[cmdk-group-items]]:grid-cols-8 **:[[cmdk-group-items]]:gap-0.5 **:[[cmdk-group-items]]:p-1"
                    >
                      {category.emojis.map((emoji) => (
                        <CommandItem
                          key={emoji.hexcode}
                          value={emoji.hexcode}
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
