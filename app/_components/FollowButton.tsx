"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loginHref } from "@/lib/auth/next";
import { getMyFollows, toggleFollow } from "@/lib/follows/client";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Author } from "@/lib/types";
import { userKey } from "@/lib/users/key";

type Props = {
  user: Author;
  /** フォロワー数を ±1 する（ページの数字を一緒に動かす） */
  onDelta?: (d: number) => void;
  className?: string;
};

/**
 * フォローボタン。押す前は「＋ フォローする」の付箋、押すと「フォロー中」のマグネット。
 * 先に見た目と数を変えて（楽観的更新）、失敗したら戻して赤ペンで知らせる。
 * Supabase ありで Google ログインしていないときは、ログインへの付箋を出す（ストックと同じ）。
 */
export function FollowButton({ user, onDelta, className = "" }: Props) {
  const pathname = usePathname();
  const key = userKey(user);
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [needLogin, setNeedLogin] = useState(false);
  const delta = useRef(onDelta);
  useEffect(() => {
    delta.current = onDelta;
  }, [onDelta]);

  useEffect(() => {
    let alive = true;
    getMyFollows().then((mine) => {
      if (!alive || !mine.has(key)) return;
      setFollowing(true);
      // 仮保存モードでは、サーバー（見本の数）に自分のフォローが入っていないので足す
      if (!getBrowserSupabase()) delta.current?.(1);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const press = async () => {
    if (pending) return;
    const before = following;
    setError(undefined);
    setNeedLogin(false);
    setFollowing(!before);
    onDelta?.(before ? -1 : 1);
    setPending(true);
    const res = await toggleFollow(user, before);
    setPending(false);
    if (res.ok) return;
    setFollowing(before);
    onDelta?.(before ? 1 : -1);
    if (res.reason === "login_required") setNeedLogin(true);
    else setError(res.message);
  };

  return (
    <span className={`relative inline-flex flex-col items-center ${className}`}>
      <motion.button
        type="button"
        onClick={press}
        aria-pressed={following}
        aria-label={following ? `${user.name}さんのフォローをやめる` : `${user.name}さんをフォローする`}
        className={`font-hand relative flex items-center gap-1 whitespace-nowrap px-4 py-2 text-[0.9rem] ${
          following
            ? "rounded-full bg-[var(--tomato)] text-white shadow-[0_3px_0_rgba(0,0,0,0.25)]"
            : "rounded-[3px_10px_3px_8px] bg-[#ffe27a] text-ink shadow-[1px_4px_8px_rgba(60,40,20,0.2)]"
        }`}
        animate={following ? { rotate: [0, -6, 3, -2], scale: [1, 1.12, 1] } : { rotate: 2, scale: 1 }}
        transition={{ duration: 0.4 }}
        whileTap={{ scale: 0.92 }}
      >
        <span aria-hidden>{following ? "🧲" : "＋"}</span>
        {following ? "フォロー中" : "フォローする"}
      </motion.button>

      <AnimatePresence>
        {needLogin && (
          <motion.span
            role="alert"
            className="font-hand absolute right-0 top-full z-30 mt-2 w-[12rem] rotate-2 bg-[#ffe27a] px-3 py-2 text-left text-[0.72rem] leading-snug text-ink shadow-[1px_4px_8px_rgba(60,40,20,0.2)]"
            initial={{ opacity: 0, y: -6, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: 2 }}
            exit={{ opacity: 0 }}
          >
            フォローは Google でログインすると使えるよ{" "}
            <Link href={loginHref(pathname)} className="underline decoration-wavy decoration-[var(--tomato)] underline-offset-4">
              ログイン →
            </Link>
          </motion.span>
        )}
        {error && (
          <motion.span
            role="alert"
            className="font-hand absolute right-0 top-full mt-2 w-max max-w-[12rem] -rotate-2 text-right text-[0.7rem] text-[#d6362a]"
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
