"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { RedPen } from "@/app/recipes/new/_components/bits";

type Props = {
  name: string | null;
  email?: string;
  /** 上の帯のひとこと */
  caption?: string;
  /** 名札の右上に押すスタンプ（「ようこそ」など） */
  stamp?: string;
  /** 名札を保存。失敗したらメッセージを返す。無ければ書きかえできない */
  onSave?: (name: string) => Promise<string | undefined>;
  className?: string;
};

/** 「HELLO この冷蔵庫の持ち主は」の名札。タップで書きかえられる（レシピの by ○○ になる） */
export function NameTag({ name, email, caption = "この冷蔵庫の持ち主は", stamp, onSave, className = "" }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    const e = await onSave(draft);
    setSaving(false);
    setError(e);
    if (!e) setEditing(false);
  };

  return (
    <div className={`relative mx-auto w-[92%] rounded-[10px] bg-white shadow-[2px_6px_12px_rgba(60,40,20,0.18)] ${className}`}>
      <div className="rounded-t-[10px] bg-[var(--tomato)] px-4 py-1.5 text-center text-white">
        <p className="text-[0.62rem] tracking-[0.3em]">HELLO</p>
        <p className="font-hand text-sm">{caption}</p>
      </div>
      <div className="px-4 pb-4 pt-3 text-center">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={20}
              autoFocus
              aria-label="名札（投稿者名）"
              className="font-hand min-w-0 flex-1 border-b-2 border-ink/40 bg-transparent text-center text-2xl text-ink outline-none"
            />
            <button type="submit" disabled={saving} className="font-hand shrink-0 rounded-full bg-ink px-3 py-1 text-xs text-white disabled:opacity-50">
              {saving ? "…" : "書く"}
            </button>
          </form>
        ) : onSave ? (
          <button type="button" onClick={() => setEditing(true)} className="group w-full" aria-label="名札を書きかえる">
            <span className="font-hand block text-[1.8rem] leading-tight text-ink">{name ?? "ななしの台所"}</span>
            <span className="text-[0.62rem] text-ink/40 group-hover:text-ink/70">✎ タップで書きかえ（レシピの「by ○○」になります）</span>
          </button>
        ) : (
          <span className="font-hand block text-[1.8rem] leading-tight text-ink">{name ?? "ななしの台所"}</span>
        )}
        <RedPen message={error} />
        {email && <p className="mt-1 truncate text-[0.62rem] text-ink/40">{email}</p>}
      </div>
      {stamp && (
        <motion.span
          aria-hidden
          className="font-hand absolute -right-4 -top-5 rounded-full border-[3px] border-[#c0392b] bg-[#fffdf6]/80 px-2 text-[#c0392b]"
          initial={{ scale: 2, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 0.9, rotate: -14 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 600, damping: 15 }}
        >
          {stamp}
        </motion.span>
      )}
    </div>
  );
}
