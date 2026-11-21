"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loginHref } from "@/lib/auth/next";
import { getMyStocks, toggleStock } from "@/lib/stocks/client";

type Props = { recipeId: string; className?: string };

/**
 * ストック（あとで作りたい）。冷蔵庫にレシピを挟んでおく「クリップ」のマグネット。
 * 先に見た目を変えて（楽観的更新）、失敗したら戻して赤ペンで知らせる。
 * Supabase ありで Google ログインしていないときは、ログインへの付箋を出す。
 */
export function StockButton({ recipeId, className = "" }: Props) {
  const pathname = usePathname();
  const [stocked, setStocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    let alive = true;
    getMyStocks().then((mine) => alive && setStocked(mine.has(recipeId)));
    return () => {
      alive = false;
    };
  }, [recipeId]);

  const press = async () => {
    if (pending) return;
    const before = stocked;
    setError(undefined);
    setNeedLogin(false);
    setStocked(!before);
    setPending(true);
    const res = await toggleStock(recipeId, before);
    setPending(false);
    if (res.ok) return setStocked(res.stocked);
    setStocked(before);
    if (res.reason === "login_required") setNeedLogin(true);
    else setError(res.message);
  };

  return (
    <span className={`relative inline-flex flex-col items-center ${className}`}>
      <motion.button
        type="button"
        onClick={press}
        aria-pressed={stocked}
        aria-label={stocked ? "ストックから外す" : "ストックする（あとで作る）"}
        className="relative grid h-[58px] w-[52px] place-items-center"
        whileTap={{ scale: 0.88 }}
        animate={stocked ? { rotate: [0, 6, -3, 4] } : { rotate: 4 }}
        transition={{ duration: 0.35 }}
      >
        <svg viewBox="0 0 52 58" className="h-full w-full drop-shadow-[0_3px_0_rgba(0,0,0,0.22)]" aria-hidden>
          {/* はさんでいる紙 */}
          <motion.rect
            x="13"
            width="26"
            height="30"
            rx="2"
            fill="#fff"
            stroke="var(--ink)"
            strokeWidth="1.6"
            initial={false}
            animate={{ y: stocked ? 22 : 30, opacity: stocked ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          />
          {/* クリップの本体 */}
          <rect x="6" y="18" width="40" height="16" rx="5" fill={stocked ? "#3c8dde" : "#fff8ea"} stroke="var(--ink)" strokeWidth="2.4" />
          <path d="M11 22 Q 16 20 22 21" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* 針金のつまみ。ストックすると、パチッと倒れる */}
          <motion.path
            d="M15 19 L 13 5 Q 26 1 39 5 L 37 19"
            fill="none"
            stroke="#8d969e"
            strokeWidth="2.6"
            strokeLinejoin="round"
            style={{ transformBox: "fill-box", originY: 1 }}
            initial={false}
            animate={{ scaleY: stocked ? 0.45 : 1, y: stocked ? 7 : 0 }}
            transition={{ type: "spring", stiffness: 700, damping: 14 }}
          />
        </svg>
      </motion.button>
      <span className={`font-hand -mt-0.5 whitespace-nowrap text-[0.68rem] ${stocked ? "text-[#2f6fb0]" : "text-ink/70"}`}>
        {stocked ? "ストック済み" : "ストック"}
      </span>

      <AnimatePresence>
        {needLogin && (
          <motion.span
            role="alert"
            className="font-hand absolute right-0 top-full z-30 mt-1 w-[11.5rem] rotate-2 bg-[#ffe27a] px-3 py-2 text-left text-[0.72rem] leading-snug text-ink shadow-[1px_4px_8px_rgba(60,40,20,0.2)]"
            initial={{ opacity: 0, y: -6, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: 2 }}
            exit={{ opacity: 0 }}
          >
            ストックは Google でログインすると使えるよ{" "}
            <Link href={loginHref(pathname)} className="underline decoration-wavy decoration-[var(--tomato)] underline-offset-4">
              ログイン →
            </Link>
          </motion.span>
        )}
        {error && (
          <motion.span
            role="alert"
            className="font-hand absolute right-0 top-full mt-1 w-max max-w-[11rem] -rotate-2 text-right text-[0.7rem] text-[#d6362a]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
