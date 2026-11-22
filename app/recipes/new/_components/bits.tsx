"use client";

import { AnimatePresence, motion } from "motion/react";

/** 赤ペンの書き込み。エラーを該当箇所の横に出す */
export function RedPen({ message, id }: { message?: string; id?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          id={id}
          role="alert"
          className="font-hand mt-1 inline-flex items-center gap-1 text-[0.8rem] text-[#d6362a]"
          initial={{ opacity: 0, x: -6, rotate: -4 }}
          animate={{ opacity: 1, x: 0, rotate: -2 }}
          exit={{ opacity: 0 }}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden>
            <motion.path
              d="M3 10 C 3 3, 17 3, 17 10 S 3 17, 3 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4 }}
            />
          </svg>
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** セクションの見出し。マスキングテープに手書き */
export function Tape({ children, color = "rgba(255,226,122,0.8)", tilt = -2 }: { children: React.ReactNode; color?: string; tilt?: number }) {
  return (
    <h2 className="font-hand relative inline-block px-3 py-0.5 text-[0.95rem] text-ink" style={{ background: color, rotate: `${tilt}deg` }}>
      {children}
    </h2>
  );
}

/** ± の手書き風ステッパー */
export function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <span className="whitespace-nowrap text-[0.7rem] text-ink/60">{label}</span>
      <motion.button
        type="button"
        aria-label={`${label}を減らす`}
        onClick={() => set(value - step)}
        disabled={value <= min}
        whileTap={{ scale: 0.85, rotate: -10 }}
        className="grid h-7 w-7 place-items-center rounded-full border-2 border-ink/70 text-ink disabled:opacity-30"
      >
        −
      </motion.button>
      <motion.span
        key={value}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="font-hand min-w-[3.2rem] text-center text-lg text-ink"
        aria-live="polite"
      >
        {value}
        <span className="text-xs">{unit}</span>
      </motion.span>
      <motion.button
        type="button"
        aria-label={`${label}を増やす`}
        onClick={() => set(value + step)}
        disabled={value >= max}
        whileTap={{ scale: 0.85, rotate: 10 }}
        className="grid h-7 w-7 place-items-center rounded-full border-2 border-ink/70 text-ink disabled:opacity-30"
      >
        ＋
      </motion.button>
    </div>
  );
}

/** 写真ファイルを選ぶ隠し input 付きのラベル */
export function PhotoPicker({
  onPick,
  children,
  className = "",
  label,
}: {
  onPick: (file: File) => void;
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`cursor-pointer ${className}`} aria-label={label}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      {children}
    </label>
  );
}
