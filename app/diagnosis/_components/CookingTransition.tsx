"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const LINES = ["とんとん…", "じゅわ〜", "ぐつぐつ…", "チン！"];

/** 扉が閉まったあと、扉の表で見せる調理中の演出 */
export function CookingTransition({ active }: { active: boolean }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setI((n) => Math.min(n + 1, LINES.length - 1)), 520);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;
  const done = i === LINES.length - 1;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pr-8">
      <div className="relative">
        {/* 湯気は料理中だけ（「チン！」のあと結果の下で出し続けない） */}
        {!done &&
          [0, 1, 2].map((n) => (
          <motion.svg
            key={n}
            viewBox="0 0 20 60"
            aria-hidden
            className="absolute -top-14 w-4"
            style={{ left: `${18 + n * 22}%` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 0.8, 0], y: [10, -14, -30] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: n * 0.45 }}
          >
            <path d="M10 58 C 0 45, 20 35, 10 22 S 14 4, 8 2" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </motion.svg>
        ))}
        <motion.span
          className="block text-6xl"
          animate={done ? { rotate: 0, scale: [1, 1.2, 1] } : { rotate: [-4, 4, -4], y: [0, -3, 0] }}
          transition={done ? { duration: 0.4 } : { duration: 0.5, repeat: Infinity }}
        >
          {done ? "🍽️" : "🍲"}
        </motion.span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={LINES[i]}
          className={`font-hand ${done ? "text-3xl text-[var(--tomato)]" : "text-2xl text-ink/80"}`}
          initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: done ? -6 : 3 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          {LINES[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
