"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loginHref } from "@/lib/auth/next";
import { getMyProfileName } from "@/lib/auth/profile";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useAuth } from "@/lib/supabase/useAuth";

/**
 * 小さな名札マグネット。
 * - 未ログイン・匿名: 「ログイン」→ /login?next=<いまのページ>
 * - Google でログイン済み: 名札の頭文字 → /me（わたしの冷蔵庫。ストック・投稿・名札の書きかえ・ログアウト）
 * - Supabase 未設定: 「わたしの」→ /me（ログインは無いので、この端末の仮保存を見る入口にする）
 * useAuth() を使うので、Google から戻ってきたページでもログインが完了する。
 */
export function AccountBadge({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { session, ready } = useAuth();
  const [name, setName] = useState<string | null>(null);
  const signedIn = !!session && !session.isAnonymous;

  useEffect(() => {
    if (!signedIn || !session) return;
    let alive = true;
    getMyProfileName(session.userId).then((n) => alive && setName(n));
    return () => {
      alive = false;
    };
  }, [signedIn, session]);

  if (!ready) return null;
  const configured = !!getSupabaseEnv();

  return (
    <motion.span
      className={`inline-block ${className}`}
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: signedIn ? 4 : -4 }}
      whileHover={{ rotate: 0, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 16 }}
    >
      {!configured ? (
        <Link
          href="/me"
          aria-label="わたしの冷蔵庫（この端末の仮保存）"
          className="font-hand flex items-center gap-1 rounded-full border-2 border-ink/70 bg-[#fff8ea] px-2 py-0.5 text-[0.7rem] text-ink shadow-[0_2px_0_rgba(0,0,0,0.15)]"
        >
          <span aria-hidden>🧊</span>わたしの
        </Link>
      ) : signedIn ? (
        <Link
          href="/me"
          aria-label={`${name ?? "あなた"}の冷蔵庫（ログイン中）`}
          className="flex items-center gap-1 rounded-full bg-white py-0.5 pl-0.5 pr-2 shadow-[0_2px_0_rgba(0,0,0,0.2)]"
        >
          <span className="font-hand grid h-6 w-6 place-items-center rounded-full bg-[var(--tomato)] text-xs text-white">{[...(name ?? "ぼ")][0]}</span>
          <span className="font-hand max-w-[5rem] truncate text-[0.68rem] text-ink">{name ?? "…"}</span>
        </Link>
      ) : (
        <Link
          href={loginHref(pathname)}
          className="font-hand flex items-center gap-1 rounded-full border-2 border-ink/70 bg-[#fff8ea] px-2 py-0.5 text-[0.7rem] text-ink shadow-[0_2px_0_rgba(0,0,0,0.15)]"
        >
          <span aria-hidden>🔑</span>ログイン
        </Link>
      )}
    </motion.span>
  );
}

