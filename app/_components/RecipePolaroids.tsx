"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { jitter } from "@/lib/jitter";
import { Photo } from "./Photo";
import { PlatePlaceholder } from "./recipe/RecipeParts";

export type PolaroidItem = {
  id: string;
  title: string;
  coverImage?: string | null;
  /** レシピページ。この端末だけの仮保存レシピには無い */
  href: string | null;
};

type Props = {
  items: PolaroidItem[];
  /** あれば各写真に「はずす」を付ける */
  onRemove?: (id: string) => void;
  /** 「はずす」の読み上げ（例: 「○○をストックから外す」） */
  removeLabel?: (title: string) => string;
};

/** レシピの小さなポラロイドを2列に（わたしの冷蔵庫・ユーザーページ） */
export function PolaroidGrid({ items, onRemove, removeLabel = (t) => `${t}を外す` }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
      <AnimatePresence initial={false}>
        {items.map((r, i) => (
          <motion.li
            key={r.id}
            layout
            className="relative"
            initial={{ opacity: 0, y: 16, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: jitter(r.id, -3, 3) }}
            exit={{ opacity: 0, scale: 0.6, rotate: 12, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 220, damping: 18, delay: Math.min(i, 8) * 0.04 }}
          >
            <Polaroid r={r} />
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(r.id)}
                aria-label={removeLabel(r.title)}
                className="font-hand absolute -right-1.5 -top-2 z-10 rounded-full border-2 border-ink/70 bg-white px-1.5 text-[0.62rem] text-ink/70 shadow-[0_2px_0_rgba(0,0,0,0.15)] hover:text-ink"
              >
                はずす
              </button>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Polaroid({ r }: { r: PolaroidItem }) {
  const body = (
    <>
      <span aria-hidden className="absolute -top-1.5 left-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#3c8dde] shadow-[0_1.5px_0_rgba(0,0,0,0.25)]" />
      <span className="relative block aspect-square overflow-hidden">
        {r.coverImage ? <Photo src={r.coverImage} alt="" sizes="200px" fallback={<PlatePlaceholder title={r.title} />} /> : <PlatePlaceholder title={r.title} />}
      </span>
      <span className="font-hand mt-1.5 line-clamp-2 block text-[0.85rem] leading-tight text-ink">{r.title}</span>
      {!r.href && <span className="mt-0.5 block text-[0.6rem] text-ink/45">この端末に仮保存</span>}
    </>
  );
  const cls = "relative block bg-white p-1.5 pb-2.5 shadow-[1px_4px_8px_rgba(60,40,20,0.16)]";
  return r.href ? (
    <Link href={r.href} className={`${cls} transition-transform hover:-translate-y-1`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
