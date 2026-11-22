"use client";

import { AnimatePresence, motion } from "motion/react";
import type { DraftPhoto } from "../_lib/draft";
import { PhotoPicker } from "./bits";

type Props = {
  cover?: DraftPhoto;
  onPick: (file: File) => void;
  onClear: () => void;
};

/** 完成写真。ポラロイドを1枚、ノートの端にクリップで留める */
export function CoverPolaroid({ cover, onPick, onClear }: Props) {
  return (
    <motion.div
      className="relative w-[9.5rem] shrink-0 bg-white p-2 pb-6 shadow-[2px_6px_12px_rgba(0,0,0,0.16)]"
      initial={{ rotate: 12, y: -20, opacity: 0 }}
      animate={{ rotate: 5, y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 14 }}
    >
      {/* クリップ */}
      <span className="absolute -top-3 left-4 h-7 w-3 rounded-sm border-2 border-[#9aa4ad] bg-[#cfd6dc]" aria-hidden />

      <PhotoPicker onPick={onPick} label={cover ? "完成写真を選び直す" : "完成写真を選ぶ"} className="block">
        <span className="relative block aspect-square overflow-hidden bg-[repeating-linear-gradient(45deg,#f3eadb_0_8px,#ece0cc_8px_16px)]">
          <AnimatePresence mode="wait">
            {cover ? (
              <motion.span
                key={cover.preview}
                className="absolute inset-0"
                initial={{ opacity: 0, filter: "brightness(2.2)" }}
                animate={{ opacity: 1, filter: "brightness(1)" }}
                transition={{ duration: 0.9 }}
              >
                {/* object URL のプレビューなので next/image は通さない */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover.preview} alt="完成写真のプレビュー" className="h-full w-full object-cover" />
              </motion.span>
            ) : (
              <motion.span
                key="empty"
                className="font-hand absolute inset-0 grid place-items-center text-center text-[0.78rem] leading-snug text-ink/50"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                📷
                <br />
                完成写真
                <br />
                （なくてもOK）
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </PhotoPicker>

      <span className="font-hand absolute bottom-1 left-2 text-[0.68rem] text-ink/50">{cover ? "できあがり" : "タップで選ぶ"}</span>
      {cover && (
        <button
          type="button"
          onClick={onClear}
          aria-label="完成写真を外す"
          className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-white"
        >
          ×
        </button>
      )}
    </motion.div>
  );
}
