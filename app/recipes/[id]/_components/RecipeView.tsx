"use client";

import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CountryChips } from "@/app/_components/CountryChips";
import { AccountBadge } from "@/app/_components/AccountBadge";
import { Kitchen } from "@/app/_components/Kitchen";
import { LikeButton } from "@/app/_components/LikeButton";
import { StockButton } from "@/app/_components/StockButton";
import { Cover, Gallery, IngredientsList, Lightbox, StepsList, type Zoomed } from "@/app/_components/recipe/RecipeParts";
import { getLocalComments } from "@/lib/reactions/client";
import { jitter, pick } from "@/lib/jitter";
import type { Recipe, RecipeComment } from "@/lib/types";

type Props = {
  recipe: Recipe;
  likes: number;
  commentCount: number;
  /** 新しいコメント3件（ちら見せ用） */
  latest: RecipeComment[];
};

const NOTE_COLORS = ["#ffe27a", "#ffc2cf", "#bfe3ff", "#d3f2b0", "#fff8ea"];

/** レシピページ。冷蔵庫に貼ったレシピカード＋スキ＋みんなのひとこと */
export function RecipeView({ recipe, likes, commentCount, latest }: Props) {
  const [zoomed, setZoomed] = useState<Zoomed>(null);
  const [notes, setNotes] = useState(latest);
  const [count, setCount] = useState(commentCount);
  const gallery = recipe.photos.filter((p) => p.url !== recipe.coverImage);

  // この端末に仮保存したコメントも混ぜる（Supabase 未接続のとき）
  useEffect(() => {
    const mine = getLocalComments(recipe.id);
    if (!mine.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage はクライアントでしか読めない
    setNotes([...mine, ...latest].slice(0, 3));
    setCount(commentCount + mine.length);
  }, [recipe.id, latest, commentCount]);

  return (
    <MotionConfig reducedMotion="user">
      <Kitchen>
        <main className="relative mx-auto w-full max-w-[460px] px-4 pb-16 pt-5">
          <header className="mb-4 flex items-end justify-between">
            <Link href="/diagnosis" className="font-hand text-sm text-ink/60 hover:text-ink">
              ← 冷蔵庫へ
            </Link>
            <AccountBadge className="ml-auto mr-3" />
            <Link href="/recipes/new" className="font-hand -rotate-2 text-sm text-ink/60 underline decoration-[var(--tomato)] decoration-wavy underline-offset-4 hover:text-ink">
              自分のも貼る
            </Link>
          </header>

          <motion.article
            className="receipt relative bg-[#fffdf6] px-5 pb-12 pt-5 text-ink shadow-[0_8px_30px_rgba(80,60,40,0.18)]"
            initial={{ y: 40, opacity: 0, rotate: 3 }}
            animate={{ y: 0, opacity: 1, rotate: -0.8 }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
          >
            {/* 冷蔵庫に留めているマグネット */}
            <motion.span
              aria-hidden
              className="absolute -top-3 left-1/2 h-7 w-7 -translate-x-1/2 rounded-full bg-[#3c8dde] shadow-[0_3px_0_rgba(0,0,0,0.25)]"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 500, damping: 14 }}
            />
            <header className="flex items-baseline justify-between border-b-2 border-dashed border-ink/25 pb-2 font-mono text-[0.62rem] tracking-wider text-ink/50">
              <span>RECIPE</span>
              <span>No.{String(Math.round(jitter(recipe.id, 1000, 9999)))}</span>
            </header>

            <Cover recipe={recipe} onZoom={setZoomed} />

            <div className="mt-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {recipe.catch && <p className="text-[0.7rem] text-ink/55">{recipe.catch}</p>}
                <h1 className="font-hand text-[1.8rem] leading-tight">{recipe.title}</h1>
                <p className="mt-1 flex flex-wrap gap-x-3 text-[0.68rem] text-ink/55">
                  <span>by {recipe.author.name}</span>
                  <span>⏱ {recipe.minutes}分</span>
                  <span>{recipe.servings}人分</span>
                </p>
                <CountryChips tags={recipe.tags} className="mt-1.5" />
              </div>
              <div className="mt-1 flex shrink-0 items-start gap-1">
                <StockButton recipeId={recipe.id} />
                <LikeButton recipeId={recipe.id} count={likes} />
              </div>
            </div>
            {recipe.description && <p className="mt-3 text-[0.8rem] leading-relaxed">{recipe.description}</p>}

            {gallery.length > 0 && <Gallery recipe={recipe} photos={gallery} onZoom={setZoomed} />}
            <IngredientsList recipe={recipe} />
            <StepsList recipe={recipe} onZoom={setZoomed} />
          </motion.article>

          {/* みんなのひとこと：付箋の束がはみ出している */}
          <Link href={`/recipes/${encodeURIComponent(recipe.id)}/comments`} className="group relative mt-10 block" aria-label={`みんなのひとこと（${count}件）を見る・書く`}>
            <div className="relative mx-auto min-h-[7.5rem] w-[92%]">
              {(notes.length ? notes : [null]).map((n, i) => {
                const seed = n?.id ?? `empty-${recipe.id}`;
                return (
                  <motion.div
                    key={seed}
                    className="absolute inset-x-0 top-0 min-h-[6.5rem] px-4 pb-4 pt-5 shadow-[1px_4px_8px_rgba(60,40,20,0.15)]"
                    style={{ background: pick(seed, NOTE_COLORS), zIndex: 10 - i, borderRadius: pick(seed + "br", ["2px 2px 2px 14px", "2px", "12px 2px 2px 2px"]) }}
                    initial={{ opacity: 0, y: 30, rotate: 0 }}
                    whileInView={{ opacity: 1, y: i * 9, x: i * (i % 2 ? -8 : 7), rotate: jitter(seed, -5, 5) + i * (i % 2 ? -3 : 3) }}
                    whileHover={i === 0 ? { y: -6, rotate: 0 } : undefined}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 180, damping: 16, delay: i * 0.08 }}
                  >
                    {i === 0 && <span aria-hidden className="absolute -top-2 left-6 h-4 w-4 rounded-full bg-[#e74c3c] shadow-[0_1px_0_rgba(0,0,0,0.3)]" />}
                    {i === 0 &&
                      (n ? (
                        <>
                          <p className="font-hand line-clamp-2 text-[0.9rem] leading-snug text-ink">{n.body}</p>
                          <p className="mt-1 text-[0.62rem] text-ink/50">― {n.author.name}</p>
                        </>
                      ) : (
                        <p className="font-hand text-[0.9rem] text-ink/70">まだだれも貼ってない。最初のひとことをどうぞ</p>
                      ))}
                  </motion.div>
                );
              })}
            </div>
            <p className="font-hand relative z-20 mt-6 text-center text-sm text-ink">
              みんなのひとこと <span className="text-[var(--tomato)]">{count}</span>
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
            </p>
          </Link>
        </main>
        <Lightbox zoomed={zoomed} onClose={() => setZoomed(null)} />
      </Kitchen>
    </MotionConfig>
  );
}
