"use client";

import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AccountBadge } from "@/app/_components/AccountBadge";
import { Avatar } from "@/app/_components/Avatar";
import { FollowButton } from "@/app/_components/FollowButton";
import { Kitchen } from "@/app/_components/Kitchen";
import { PolaroidGrid } from "@/app/_components/RecipePolaroids";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useAuth } from "@/lib/supabase/useAuth";
import type { UserPage } from "@/lib/users/read";

/** ほかの人の冷蔵庫（/users/[id]）。アイコン・名前・フォロワー数・その人のレシピ */
export function UserView({ user }: { user: UserPage }) {
  const { session } = useAuth();
  const [followers, setFollowers] = useState(user.followers);
  const onDelta = useCallback((d: number) => setFollowers((n) => Math.max(0, n + d)), []);

  const isMe = !!user.id && session?.userId === user.id;
  // Supabase ありのとき、名前だけの作者（見本データ）はアカウントが無いのでフォローできない
  const canFollow = !isMe && (!!user.id || !getSupabaseEnv());
  const author = { name: user.name, ...(user.id ? { id: user.id } : {}), avatarUrl: user.avatarUrl };

  return (
    <MotionConfig reducedMotion="user">
      <Kitchen>
        <main className="relative mx-auto w-full max-w-[460px] px-4 pb-16 pt-5">
          <header className="mb-6 flex items-end justify-between">
            <Link href="/diagnosis" className="font-hand text-sm text-ink/60 hover:text-ink">
              ← 冷蔵庫へ
            </Link>
            <AccountBadge className="ml-auto mr-3" />
            <p className="font-hand -rotate-2 text-[1.1rem] text-ink">だれかの冷蔵庫</p>
          </header>

          <section className="fridge-door relative rounded-[22px_26px_14px_16px] px-4 pb-8 pt-8">
            {/* 取っ手 */}
            <span aria-hidden className="absolute right-3 top-[8%] h-28 w-[9px] rounded-full bg-[var(--chrome)] shadow-[1px_2px_0_rgba(0,0,0,0.18)]" />

            {/* 持ち主のアイコンと名前 */}
            <div className="flex items-center gap-4 pr-6">
              <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: -6 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
                <Avatar name={user.name} url={user.avatarUrl} size={84} className="border-4" />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.62rem] tracking-[0.3em] text-ink/50">この冷蔵庫の持ち主</p>
                <h1 className="font-hand break-words text-[1.7rem] leading-tight text-ink">{user.name}</h1>
                {!user.id && <p className="mt-0.5 text-[0.62rem] text-ink/45">見本レシピの作者</p>}
              </div>
            </div>

            {/* 数とフォロー */}
            <div className="mt-5 flex items-center justify-between gap-3 pr-6">
              <p className="font-hand flex gap-3 text-ink">
                <Count n={followers} label="フォロワー" />
                <Count n={user.following} label="フォロー中" />
                <Count n={user.recipes.length} label="レシピ" />
              </p>
              {isMe ? (
                <Link href="/me" className="font-hand shrink-0 text-sm text-ink underline decoration-wavy decoration-[var(--tomato)] underline-offset-4">
                  あなたのページ →
                </Link>
              ) : (
                canFollow && <FollowButton user={author} onDelta={onDelta} className="shrink-0" />
              )}
            </div>

            <h2 className="font-hand mt-8 text-sm text-ink/70">この人のレシピ</h2>
            <div className="mt-3">
              <PolaroidGrid
                items={user.recipes.map((r) => ({ id: r.id, title: r.title, coverImage: r.coverImage, href: `/recipes/${encodeURIComponent(r.id)}` }))}
              />
            </div>
          </section>
        </main>
      </Kitchen>
    </MotionConfig>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <span className="flex flex-col items-center leading-tight">
      <motion.span key={n} className="text-xl text-[var(--tomato)]" initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {n}
      </motion.span>
      <span className="whitespace-nowrap text-[0.6rem] text-ink/60">{label}</span>
    </span>
  );
}
