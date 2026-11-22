"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccountBadge } from "@/app/_components/AccountBadge";
import type { Phase } from "./DiagnosisFlow";
import { FridgeFace, type FaceMood } from "./FridgeFace";

type Props = {
  phase: Phase;
  canOpen: boolean;
  onOpen: () => void;
  door: React.ReactNode;
  interior: React.ReactNode;
  /** 冷蔵庫くんがいましゃべっている台詞（口パク用） */
  line?: string;
};

const MOODS: Record<Phase, FaceMood> = { door: "smile", inside: "cold", cooking: "excited", result: "happy" };

export function Fridge({ phase, canOpen, onOpen, door, interior, line }: Props) {
  const open = phase === "inside";
  const [doorScope, animateDoor] = useAnimate<HTMLDivElement>();
  const [pout, setPout] = useState(false);
  const poutTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(poutTimer.current), []);

  const tryOpen = () => {
    if (canOpen) return onOpen();
    // まだメモが残っているときは、扉がガタッとして、冷蔵庫くんがむっとする
    animateDoor(doorScope.current, { x: [0, -7, 5, -3, 1, 0] }, { duration: 0.45 });
    setPout(true);
    clearTimeout(poutTimer.current);
    poutTimer.current = setTimeout(() => setPout(false), 1200);
  };

  return (
    <motion.div
      layout
      className="relative min-h-0 w-full flex-1"
      transition={{ type: "spring", stiffness: 160, damping: 22 }}
    >
      {/* 本体。料理中だけガタガタ揺れる（待っている間は止めておく：スマホで重くなるため） */}
      <motion.div
        className="fridge-body relative flex h-full flex-col rounded-[30px_36px_14px_18px/30px_32px_14px_16px] p-[7px]"
        animate={phase === "cooking" ? { x: [0, -2, 2, -1.5, 1.5, 0], rotate: [0, -0.4, 0.4, 0] } : { x: 0, rotate: 0 }}
        transition={phase === "cooking" ? { duration: 0.32, repeat: Infinity } : { duration: 0.3 }}
      >
        <Freezer mood={pout ? "pout" : MOODS[phase]} line={line} />

        {/* 冷蔵室 */}
        <div className="relative mt-[6px] min-h-0 flex-1 [perspective:1400px]">
          <div className="fridge-interior absolute inset-0 rounded-[10px_12px_10px_12px]">
            <InteriorLight on={open} />
            <div className="relative h-full">{interior}</div>
            <ColdAir on={open} />
          </div>

          <motion.div
            ref={doorScope}
            className="absolute inset-0 origin-left [transform-style:preserve-3d]"
            initial={false}
            animate={{ rotateY: open ? -118 : 0 }}
            transition={{ type: "spring", stiffness: open ? 60 : 110, damping: open ? 11 : 16 }}
            style={{ pointerEvents: open ? "none" : "auto" }}
          >
            <div className="fridge-door absolute inset-0 rounded-[10px_16px_12px_10px] [backface-visibility:hidden]">
              {door}
              <Handle canOpen={canOpen && phase === "door"} onPull={tryOpen} disabled={phase !== "door"} />
            </div>
            {/* 扉の裏側 */}
            <div className="fridge-door-back absolute inset-0 rounded-[16px_10px_10px_12px] [backface-visibility:hidden] [transform:rotateY(180deg)]" />
          </motion.div>
        </div>
      </motion.div>

      <Beep active={open} />
      {/* 冷蔵庫の足と影 */}
      <div aria-hidden className="absolute -bottom-2 left-[8%] right-[6%] h-3 rounded-[50%] bg-black/15 blur-[3px]" />
    </motion.div>
  );
}

function Freezer({ mood, line }: { mood: FaceMood; line?: string }) {
  return (
    <div className="fridge-door relative h-[17%] min-h-[64px] shrink-0 rounded-[24px_30px_8px_10px/24px_26px_8px_10px]">
      {/* 横向きの取っ手 */}
      <div className="absolute bottom-3 left-[18%] h-[7px] w-[38%] rounded-full bg-[var(--chrome)] shadow-[0_2px_0_rgba(0,0,0,0.15)]" />
      {/* 冷蔵庫くんの顔 */}
      <FridgeFace mood={mood} line={line} className="absolute left-1/2 top-1.5 w-[5.4rem] -translate-x-1/2 -rotate-2" />
      <PostPad />
      {/* 名札（ログイン） */}
      <AccountBadge className="absolute bottom-2 right-4 z-10" />
      {/* 動作中ランプ */}
      <motion.span
        aria-hidden
        className="absolute bottom-3.5 left-[60%] h-1.5 w-1.5 rounded-full bg-[#5fd38d]"
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.1, 0.2] }}
      />
      {/* 冷凍室に貼りっぱなしのマグネット */}
      <span aria-hidden className="absolute right-5 top-2 -rotate-6 text-xl">
        🐟
      </span>
    </div>
  );
}

/**
 * 冷凍室に貼ったマグネット付きのメモ帳。診断しなくても、ここからすぐレシピを貼りに行ける。
 * いちばん上の紙が最初に2回だけ「ぺらっ」とめくれて、気づいてもらう（ずっと動かすと重いので）。
 */
function PostPad() {
  return (
    <Link
      href="/recipes/new"
      aria-label="自分のレシピを冷蔵庫に貼る"
      className="group absolute left-3 top-2.5 z-10 block w-[5.2rem] -rotate-[7deg]"
    >
      {/* 下の紙（束っぽさ） */}
      <span aria-hidden className="absolute inset-0 translate-x-[3px] translate-y-[3px] rotate-[4deg] rounded-[2px] bg-[#f3e6c4] shadow-[1px_2px_3px_rgba(0,0,0,0.12)]" />
      <motion.span
        className="relative block origin-top rounded-[2px] bg-[#fff8ea] px-1.5 pb-1.5 pt-2.5 shadow-[1px_2px_3px_rgba(0,0,0,0.15)] group-hover:-rotate-2"
        animate={{ rotateX: [0, 0, 28, -6, 0], y: [0, 0, -2, 0, 0] }}
        transition={{ duration: 1.1, repeat: 1, repeatDelay: 5.5, delay: 1.5, times: [0, 0.2, 0.5, 0.75, 1] }}
        style={{ transformPerspective: 300 }}
      >
        {/* マグネット */}
        <span aria-hidden className="absolute -top-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#3c8dde] shadow-[0_1.5px_0_rgba(0,0,0,0.25)]" />
        <span className="font-hand block text-[0.62rem] leading-tight text-ink">
          レシピを
          <br />
          貼る
          <span className="ml-0.5 inline-block text-[var(--tomato)] transition-transform group-hover:translate-x-0.5">✎</span>
        </span>
        {/* 罫線 */}
        <span aria-hidden className="mt-0.5 block h-px bg-[rgba(60,141,222,0.25)]" />
      </motion.span>
    </Link>
  );
}

function Handle({ canOpen, onPull, disabled }: { canOpen: boolean; onPull: () => void; disabled: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={canOpen ? "冷蔵庫を開ける" : "まだメモが残っています"}
      disabled={disabled}
      onClick={onPull}
      drag={disabled ? false : "x"}
      dragConstraints={{ left: -40, right: 0 }}
      dragElastic={0.15}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        if (info.offset.x < -22) onPull();
      }}
      className="absolute right-2.5 top-[8%] z-20 flex h-[34%] w-6 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
    >
      <motion.span
        className="relative block h-full w-[9px] rounded-full bg-[var(--chrome)] shadow-[1px_2px_0_rgba(0,0,0,0.18)]"
        animate={{ x: canOpen ? [0, -3, 0] : 0 }}
        transition={canOpen ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
      >
        {/* 光る輪。boxShadow を動かすと毎フレーム描き直しになるので、opacity と scale だけで光らせる */}
        <AnimatePresence>
          {canOpen && (
            <motion.span
              aria-hidden
              className="absolute -inset-[5px] -z-10 rounded-full bg-[rgba(255,170,60,0.45)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.7, 1, 0.7] }}
              // exit に transition を書かないと repeat: Infinity を引き継いで、消えずに動き続ける
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
        </AnimatePresence>
      </motion.span>
      <AnimatePresence>
        {canOpen && (
          <motion.span
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: [0, -6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ x: { duration: 1.4, repeat: Infinity } }}
            className="font-hand pointer-events-none absolute -left-16 top-1/2 -translate-y-1/2 -rotate-6 whitespace-nowrap text-sm text-[var(--tomato)]"
          >
            ← ひっぱる
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/** 開けた瞬間にちらついてから点く庫内灯 */
function InteriorLight({ on }: { on: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,250,215,0.95),rgba(255,250,215,0)_70%)]"
      initial={false}
      animate={on ? { opacity: [0, 0.8, 0.15, 0.9, 0.5, 1] } : { opacity: 0 }}
      transition={on ? { duration: 0.9, times: [0, 0.15, 0.3, 0.5, 0.65, 1], delay: 0.15 } : { duration: 0.3 }}
    />
  );
}

/** 冷気。重いので下へ流れ落ちる。開けたときに2回だけ流す（ぼかし filter は使わず、グラデーションでふんわりさせる） */
function ColdAir({ on }: { on: boolean }) {
  if (!on) return null;
  const puffs = [8, 26, 47, 63, 81];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 overflow-visible">
      {puffs.map((left, i) => (
        <motion.span
          key={left}
          className="absolute bottom-0 h-14 w-20 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.75),rgba(255,255,255,0))]"
          style={{ left: `${left}%` }}
          initial={{ y: 0, opacity: 0, scale: 0.6 }}
          animate={{ y: [0, 40, 90], opacity: [0, 0.7, 0], scale: [0.6, 1.1, 1.5] }}
          transition={{ duration: 3 + (i % 3) * 0.7, repeat: 1, delay: i * 0.55, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

const BEEPS = ["ピピッ", "ぼく、開けっぱなしだよ〜", "ひんやり〜", "そろそろ閉めてね！"];

/** 扉を開けたままにしていると鳴る */
function Beep({ active }: { active: boolean }) {
  const [n, setN] = useState(-1);

  useEffect(() => {
    if (!active) return;
    let count = 0;
    const show = setInterval(() => setN(count++ % BEEPS.length), 11000);
    return () => {
      clearInterval(show);
      setN(-1);
    };
  }, [active]);

  // 表示から3.5秒で消す
  useEffect(() => {
    if (n < 0) return;
    const t = setTimeout(() => setN(-1), 3500);
    return () => clearTimeout(t);
  }, [n]);

  return (
    <AnimatePresence>
      {active && n >= 0 && (
        <motion.div
          key={n}
          initial={{ opacity: 0, scale: 0.6, rotate: 6, y: 10 }}
          animate={{ opacity: 1, scale: 1, rotate: -3, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -8 }}
          className="font-hand absolute -right-1 top-[14%] z-30 rounded-[14px_14px_4px_14px] border-2 border-ink bg-white px-2.5 py-1 text-xs text-ink shadow-[2px_2px_0_var(--ink)]"
        >
          {BEEPS[n]}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
