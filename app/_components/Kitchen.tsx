"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

/** 背景のキッチン。壁のタイル、床、ちゃんと動く壁掛け時計。 */
export function Kitchen({ children }: { children: React.ReactNode }) {
  return (
    <div className="kitchen-wall relative min-h-dvh overflow-clip">
      <WallClock />
      {/* 窓から入る光（ずっと動かすとスマホで重いので、置いておくだけ） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,236,190,0.55),transparent_65%)] opacity-90"
      />
      <div aria-hidden className="kitchen-floor absolute inset-x-0 bottom-0 h-[16dvh]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function WallClock() {
  const [start, setStart] = useState<{ s: number; m: number; h: number } | null>(null);

  useEffect(() => {
    const d = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 現在時刻はクライアントでしか取れない
    setStart({
      s: d.getSeconds() * 6,
      m: d.getMinutes() * 6 + d.getSeconds() * 0.1,
      h: (d.getHours() % 12) * 30 + d.getMinutes() * 0.5,
    });
  }, []);

  return (
    <div
      aria-hidden
      className="absolute left-3 top-24 hidden h-20 w-20 rotate-3 rounded-full border-[5px] border-[#b36b3f] bg-[#fffaf0] shadow-[2px_4px_0_rgba(80,50,30,0.18)] sm:block lg:left-[12vw] lg:top-28 lg:h-28 lg:w-28"
    >
      {start && (
        <>
          <Hand deg={start.h} len="28%" w={3} dur={43200} />
          <Hand deg={start.m} len="38%" w={2} dur={3600} />
          <Hand deg={start.s} len="42%" w={1} dur={60} color="var(--tomato)" />
        </>
      )}
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
    </div>
  );
}

function Hand({ deg, len, w, dur, color = "var(--ink)" }: { deg: number; len: string; w: number; dur: number; color?: string }) {
  return (
    <motion.span
      className="absolute bottom-1/2 left-1/2 origin-bottom rounded-full"
      style={{ height: len, width: w, marginLeft: -w / 2, background: color }}
      initial={{ rotate: deg }}
      animate={{ rotate: deg + 360 }}
      transition={{ duration: dur, repeat: Infinity, ease: "linear" }}
    />
  );
}
