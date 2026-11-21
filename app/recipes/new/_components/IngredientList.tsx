"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { IngredientIcon } from "@/app/_components/IngredientIcon";
import { findByName, normalizeName, searchIngredients } from "@/lib/ingredients";
import { jitter } from "@/lib/jitter";
import type { Ingredient } from "@/lib/types";
import { LIMITS } from "../_lib/limits";
import type { DraftIngredient } from "../_lib/draft";
import { RedPen, Tape } from "./bits";

type Props = {
  master: Ingredient[];
  items: DraftIngredient[];
  error?: string;
  onChange: (items: DraftIngredient[]) => void;
};

/** 材料。マスタから探すか、名前をそのまま書いて足す。分量はチップの中に書き込む */
export function IngredientList({ master, items, error, onChange }: Props) {
  const [q, setQ] = useState("");
  const hits = useMemo(
    () => searchIngredients(master, q).filter((i) => !items.some((x) => x.ingredientId === i.id)),
    [master, q, items],
  );
  const exact = q.trim() ? findByName(master, q) : undefined;

  const add = (item: Omit<DraftIngredient, "key" | "amount">) => {
    const key = item.ingredientId ?? `free:${normalizeName(item.name)}`;
    if (items.some((x) => x.key === key)) return setQ("");
    if (items.length >= LIMITS.ingredients.max) return;
    onChange([...items, { ...item, key, amount: "" }]);
    setQ("");
  };
  const addTyped = () => {
    const name = q.trim().slice(0, LIMITS.ingredientName);
    if (!name) return;
    add(exact ? { ingredientId: exact.id, name: exact.name, category: exact.category, image: exact.image } : { name, category: "other" });
  };
  const update = (key: string, amount: string) => onChange(items.map((x) => (x.key === key ? { ...x, amount } : x)));
  const remove = (key: string) => onChange(items.filter((x) => x.key !== key));

  return (
    <section aria-labelledby="h-ingredients" className="relative bg-[#fff4c4] px-3 pb-3 pt-5 shadow-[2px_4px_8px_rgba(60,40,20,0.12)] [border-radius:3px_4px_18px_3px]">
      <div className="absolute -top-3 left-3" id="h-ingredients">
        <Tape tilt={-3}>材料</Tape>
      </div>

      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.li
              key={it.key}
              layout
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -20, rotate: -6 }}
              animate={{ opacity: 1, x: 0, rotate: jitter(it.key, -1.2, 1.2) }}
              exit={{ opacity: 0, x: 30, height: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
            >
              <IngredientIcon name={it.name} category={it.category} image={it.image} size={34} />
              <span className="min-w-0 shrink truncate text-[0.85rem] text-ink">{it.name}</span>
              <span className="min-w-3 flex-1 border-b border-dotted border-ink/25" />
              <input
                value={it.amount}
                onChange={(e) => update(it.key, e.target.value)}
                placeholder="分量"
                aria-label={`${it.name}の分量`}
                className="font-hand w-[5.5rem] border-b border-ink/30 bg-transparent text-right text-[0.85rem] text-ink outline-none placeholder:text-ink/45"
              />
              <button
                type="button"
                onClick={() => remove(it.key)}
                aria-label={`${it.name}を消す`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink/40 hover:bg-black/5 hover:text-ink"
              >
                ×
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <form
        className="relative mt-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          addTyped();
        }}
      >
        <div className="flex items-center gap-1.5 border-b-2 border-dashed border-ink/30 pb-0.5">
          <span aria-hidden className="text-ink/40">＋</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="材料をさがす・書く（例: 卵、パクチー）"
            aria-label="材料をさがす・足す"
            className="font-hand min-w-0 flex-1 bg-transparent py-1 text-[0.9rem] text-ink outline-none placeholder:text-ink/45"
            enterKeyHint="enter"
          />
        </div>
        <AnimatePresence>
          {q.trim() && (
            <motion.ul
              role="listbox"
              aria-label="材料の候補"
              className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-[4px_10px_10px_10px] border-2 border-ink/80 bg-white py-1 shadow-[3px_4px_0_rgba(58,47,42,0.6)]"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {hits.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => add({ ingredientId: i.id, name: i.name, category: i.category, image: i.image })}
                    className="flex w-full items-center gap-2 px-2 py-1 text-left text-[0.82rem] hover:bg-[#fff1c2]"
                  >
                    <IngredientIcon name={i.name} category={i.category} image={i.image} size={24} />
                    {i.name}
                  </button>
                </li>
              ))}
              {!exact && (
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={addTyped}
                    className="font-hand w-full border-t border-dashed border-ink/20 px-2 py-1.5 text-left text-[0.82rem] text-[var(--tomato)] hover:bg-[#fff1c2]"
                  >
                    ＋「{q.trim()}」をそのまま足す
                  </button>
                </li>
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </form>
      <RedPen message={error} />
    </section>
  );
}
