"use client";

import { motion } from "motion/react";
import { LIMITS } from "../_lib/limits";
import type { DraftErrors, RecipeDraft } from "../_lib/draft";
import { RedPen } from "./bits";

type Props = {
  draft: RecipeDraft;
  errors: DraftErrors;
  onChange: (patch: Partial<RecipeDraft>) => void;
};

/** ノートの一番上。料理名は大きく手書きで */
export function TitleNote({ draft, errors, onChange }: Props) {
  return (
    <div className="relative">
      <label className="block">
        <span className="text-[0.68rem] text-ink/55">料理名</span>
        <input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={LIMITS.title + 10}
          placeholder="ばあちゃんの肉じゃが"
          aria-invalid={!!errors.title}
          aria-describedby="err-title"
          className="font-hand block w-full bg-transparent pb-1 text-[1.6rem] leading-tight text-ink outline-none placeholder:text-ink/45"
        />
        {/* 手書きの下線。書くほど伸びる */}
        <svg viewBox="0 0 300 8" className="-mt-1 h-2 w-full" preserveAspectRatio="none" aria-hidden>
          <motion.path
            d="M2 5 Q 75 1 150 5 T 298 4"
            stroke="var(--tomato)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            // まだ何も書いていないときは薄く（例文より目立たないように）
            animate={{ pathLength: Math.max(0.08, Math.min(1, [...draft.title].length / 14)), opacity: draft.title ? 1 : 0.35 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </svg>
      </label>
      <RedPen id="err-title" message={errors.title} />

      <label className="mt-3 block">
        <span className="text-[0.68rem] text-ink/55">ひとこと（なくてもOK）</span>
        <input
          value={draft.catch}
          onChange={(e) => onChange({ catch: e.target.value })}
          placeholder="疲れた日に、これだけは作れる"
          className="block w-full border-b border-dashed border-ink/25 bg-transparent py-1 text-[0.9rem] text-ink outline-none placeholder:text-ink/45"
        />
      </label>
      <RedPen message={errors.catch} />

      <label className="mt-2 ml-auto flex w-fit -rotate-2 items-baseline gap-1">
        <span className="font-hand text-sm text-ink/60">by</span>
        <input
          value={draft.authorName}
          onChange={(e) => onChange({ authorName: e.target.value })}
          placeholder="名前（なくてもOK）"
          aria-label="作者名"
          className="font-hand w-32 border-b border-ink/30 bg-transparent text-sm text-ink outline-none placeholder:text-ink/45"
        />
      </label>
      <RedPen message={errors.authorName} />
    </div>
  );
}
