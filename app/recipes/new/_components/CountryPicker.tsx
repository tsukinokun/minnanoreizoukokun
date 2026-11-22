"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Flag } from "@/app/_components/Flag";
import { countryByCode, POPULAR_COUNTRIES, REGION_LABELS, searchCountries, type Country, type Region } from "@/lib/countries";
import { jitter } from "@/lib/jitter";
import { LIMITS } from "../_lib/limits";
import { Tape } from "./bits";

type Props = {
  picked: string[];
  onChange: (codes: string[]) => void;
};

/** 地域ごとにスタンプのインクの色を変える */
const INK: Record<Region, string> = {
  east_asia: "#c0392b",
  southeast_asia: "#1e8449",
  south_asia: "#d35400",
  central_asia: "#8e44ad",
  middle_east: "#b9770e",
  europe: "#2e5aac",
  africa: "#a04000",
  north_america: "#1f618d",
  latin_america: "#c2185b",
  oceania: "#117a8b",
};

/**
 * 国はパスポートにスタンプを押していく。世界のどの国でも検索して押せる（5つまで）。
 * 押した国は country_xx と region_xx のタグになり、地域を通して診断に効く。
 */
export function CountryPicker({ picked, onChange }: Props) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => searchCountries(q).filter((c) => !picked.includes(c.code)), [q, picked]);
  const popular = POPULAR_COUNTRIES.filter((c) => !picked.includes(c)).map((c) => countryByCode(c)!);
  const full = picked.length >= LIMITS.countries;

  const add = (c: Country) => {
    if (full || picked.includes(c.code)) return;
    onChange([...picked, c.code]);
    setQ("");
  };
  const remove = (code: string) => onChange(picked.filter((c) => c !== code));

  return (
    <section
      aria-labelledby="h-country"
      className="relative rounded-[4px] border border-[#c8b79a] bg-[#f4ecd8] px-3 pb-4 pt-6 [background-image:radial-gradient(rgba(120,90,50,0.08)_1px,transparent_1px)] [background-size:6px_6px]"
    >
      <div className="absolute -top-3 right-4" id="h-country">
        <Tape color="rgba(211,242,176,0.9)" tilt={3}>
          どこの国の料理？
        </Tape>
      </div>
      <p className="font-hand absolute left-3 top-1.5 text-[0.6rem] tracking-[0.2em] text-ink/35" aria-hidden>
        PASSPORT
      </p>

      {/* 押したスタンプ */}
      <div className="flex min-h-[5.2rem] flex-wrap items-center justify-center gap-x-1 gap-y-2">
        <AnimatePresence initial={false}>
          {picked.map((code) => {
            const c = countryByCode(code);
            if (!c) return null;
            const tilt = jitter(code + "stamp", -18, 18);
            const ink = INK[c.region];
            return (
              <motion.button
                type="button"
                key={code}
                onClick={() => remove(code)}
                aria-label={`${c.name}のスタンプを消す`}
                className="group relative grid h-[5rem] w-[5rem] place-items-center rounded-full mix-blend-multiply"
                style={{ color: ink, border: `3px solid ${ink}`, boxShadow: `inset 0 0 0 2px ${ink}55`, marginTop: jitter(code, -4, 6) }}
                initial={{ scale: 1.9, opacity: 0, rotate: tilt - 30 }}
                animate={{ scale: 1, opacity: 0.92, rotate: tilt }}
                exit={{ scale: 0.6, opacity: 0, rotate: tilt + 40 }}
                transition={{ type: "spring", stiffness: 600, damping: 16 }}
                layout
              >
                <span className="absolute inset-[5px] rounded-full border border-current opacity-50" aria-hidden />
                <span className="relative flex flex-col items-center leading-none">
                  <Flag code={code} className="text-[1.45rem]" />
                  <span className="font-hand mt-1 max-w-[4.2rem] truncate text-[0.66rem]">{c.name}</span>
                  <span className="mt-0.5 text-[0.48rem] tracking-wider opacity-70">{c.en.toUpperCase().slice(0, 12)}</span>
                </span>
                <span className="absolute -right-1 -top-1 hidden h-5 w-5 place-items-center rounded-full bg-ink text-[0.6rem] text-white group-hover:grid" aria-hidden>
                  ×
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
        {picked.length === 0 && (
          <motion.span
            className="font-hand grid h-[4.6rem] w-[4.6rem] place-items-center rounded-full border-2 border-dashed border-ink/25 text-center text-[0.62rem] leading-snug text-ink/40"
            style={{ rotate: "-4deg" }}
          >
            ここに
            <br />
            スタンプ
          </motion.span>
        )}
      </div>

      {/* 探す */}
      <div className="relative mt-3">
        <div className="flex items-center gap-1.5 border-b-2 border-dashed border-ink/30 pb-0.5">
          <span aria-hidden className="text-ink/40">🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits[0]) {
                e.preventDefault();
                add(hits[0]);
              }
            }}
            disabled={full}
            placeholder={full ? `${LIMITS.countries}つまでだよ` : "国をさがす（ペルー、じょーじあ、Thailand…）"}
            aria-label="国をさがす"
            className="font-hand min-w-0 flex-1 bg-transparent py-1 text-[0.9rem] text-ink outline-none placeholder:text-ink/45 disabled:opacity-50"
          />
        </div>

        <AnimatePresence>
          {q.trim() && !full && (
            <motion.ul
              role="listbox"
              aria-label="国の候補"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-[4px_10px_10px_10px] border-2 border-ink/80 bg-white py-1 shadow-[3px_4px_0_rgba(58,47,42,0.6)]"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {hits.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => add(c)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[0.85rem] hover:bg-[#fff1c2]"
                  >
                    <Flag code={c.code} className="text-lg" />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-[0.62rem] text-ink/45">{REGION_LABELS[c.region]}</span>
                  </button>
                </li>
              ))}
              {hits.length === 0 && (
                <li className="font-hand px-2 py-1.5 text-[0.8rem] text-ink/50">見つからないみたい。別の書き方でさがしてみて</li>
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* 何も打っていないときの近道 */}
      {!q.trim() && !full && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {popular.map((c, i) => (
            <motion.button
              type="button"
              key={c.code}
              onClick={() => add(c)}
              aria-label={`${c.name}を押す`}
              className="flex items-center gap-1 rounded-full border border-ink/20 bg-white/70 px-2 py-0.5 text-[0.68rem] text-ink/80"
              style={{ rotate: `${jitter(c.code + "chip", -3, 3)}deg` }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -2, rotate: 0 }}
              whileTap={{ scale: 0.92 }}
            >
              <Flag code={c.code} className="text-sm" />
              {c.name}
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}
