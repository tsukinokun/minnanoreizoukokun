"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { jitter } from "@/lib/jitter";
import type { DiagnosisResult, ReactionCounts } from "@/lib/types";
import { AuthorLink } from "@/app/_components/AuthorLink";
import { CountryChips } from "@/app/_components/CountryChips";
import { LikeButton } from "@/app/_components/LikeButton";
import { StockButton } from "@/app/_components/StockButton";
import { Photo } from "@/app/_components/Photo";
import {
  Cover,
  Gallery,
  IngredientsList,
  Lightbox,
  PlatePlaceholder,
  StepsList,
  type Zoomed,
} from "@/app/_components/recipe/RecipeParts";

type Props = { results: DiagnosisResult[]; counts: ReactionCounts; onRetry: () => void };

/** 「こっちも好きかも」に出す件数 */
const MAX_OTHERS = 2;

export function RecipeCard({ results, counts, onRetry }: Props) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState<Zoomed>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const main = results[index];
  // 相性順に並んでいるので、いま見ているもの以外の先頭が「近いもの」
  const others = results.filter((_, i) => i !== index).slice(0, MAX_OTHERS);
  const { recipe } = main;

  const show = (i: number) => {
    setIndex(i);
    sheetRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // カバーと同じ写真はギャラリーに重複させない
  const gallery = recipe.photos.filter((p) => p.url !== recipe.coverImage);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(58,47,42,0.35)] px-3 pt-10 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.article
        ref={sheetRef}
        className="receipt relative mb-[-8px] max-h-[90dvh] w-full max-w-[400px] overflow-y-auto overscroll-contain bg-[#fffdf6] px-5 pb-12 pt-5 text-ink shadow-[0_-6px_30px_rgba(0,0,0,0.2)]"
        initial={{ y: "105%", rotate: 4 }}
        animate={{ y: 0, rotate: -1.2 }}
        exit={{ y: "105%" }}
        transition={{ type: "spring", stiffness: 110, damping: 15, delay: 0.1 }}
        aria-live="polite"
      >
        <header className="flex items-baseline justify-between border-b-2 border-dashed border-ink/25 pb-2 font-mono text-[0.62rem] tracking-wider text-ink/50">
          <span>きょうのあなたへ</span>
          <span>No.{String(Math.round(jitter(recipe.id, 1000, 9999)))}</span>
        </header>

        <AnimatePresence mode="wait">
          <motion.section
            key={recipe.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <Cover recipe={recipe} onZoom={setZoomed} />

            <div className="mt-4 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[0.7rem] text-ink/55">{recipe.catch}</p>
                <h2 className="font-hand text-[1.7rem] leading-tight">{recipe.title}</h2>
                <p className="mt-1 flex flex-wrap gap-x-3 text-[0.68rem] text-ink/55">
                  <AuthorLink author={recipe.author} prefix="by " />
                  <span>⏱ {recipe.minutes}分</span>
                  <span>{recipe.servings}人分</span>
                </p>
                <CountryChips tags={recipe.tags} className="mt-1.5" />
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <StockButton key={`s-${recipe.id}`} recipeId={recipe.id} />
                <LikeButton key={recipe.id} recipeId={recipe.id} count={counts[recipe.id]?.likes ?? 0} />
              </div>
            </div>
            <RecipeLinks recipeId={recipe.id} comments={counts[recipe.id]?.comments ?? 0} />
            {recipe.description && <p className="mt-2 text-[0.78rem] leading-relaxed">{recipe.description}</p>}

            <MatchMeter value={main.match} />
            <Reason result={main} />

            {gallery.length > 0 && <Gallery recipe={recipe} photos={gallery} onZoom={setZoomed} />}

            <IngredientsList recipe={recipe} have={main.matchedIngredients} />
            <StepsList recipe={recipe} onZoom={setZoomed} />
          </motion.section>
        </AnimatePresence>

        {others.length > 0 && (
          <div className="mt-7">
            <p className="font-hand text-sm text-ink/60">こっちも好きかも…</p>
            <div className="mt-4 space-y-6">
              {others.map((o, i) => (
                <OtherCard key={o.recipe.id} result={o} main={main} order={i} onPick={() => show(results.indexOf(o))} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <motion.button
            type="button"
            onClick={onRetry}
            className="font-hand rounded-full border-2 border-ink px-5 py-2 text-sm shadow-[2px_3px_0_var(--ink)]"
            whileHover={{ rotate: -2 }}
            whileTap={{ x: 2, y: 2, boxShadow: "0px 1px 0 var(--ink)" }}
          >
            ↺ もう一回、冷蔵庫をあける
          </motion.button>
        </div>
        <p className="mt-4 text-center">
          <Link
            href="/recipes/new"
            className="font-hand text-[0.8rem] text-ink/60 underline decoration-[var(--tomato)] decoration-wavy underline-offset-4 hover:text-ink"
          >
            自分のレシピも貼ってみる
          </Link>
        </p>
      </motion.article>

      <Lightbox zoomed={zoomed} onClose={() => setZoomed(null)} />
    </motion.div>
  );
}

/**
 * メインとどう近いのかをひとことで。
 * 2枚が同じ文にならないよう、2枚目は冷蔵庫の材料を先に言う。
 */
function whyClose(o: DiagnosisResult, main: DiagnosisResult, fridgeFirst: boolean): string {
  if (o.match < 20) return "意外な出会いかも？";
  const sameMood = o.moodReasons.filter((r) => main.moodReasons.includes(r));
  const mood = sameMood.length ? `「${sameMood.slice(0, 2).join("」「")}」な気分が同じ` : null;
  const fridge = o.matchedIngredients.length ? `冷蔵庫の ${o.matchedIngredients.slice(0, 2).join("・")} で作れる` : null;
  return (fridgeFirst ? fridge ?? mood : mood ?? fridge) ?? `⏱ ${o.recipe.minutes}分でできる`;
}

/** 「こっちも好きかも」の大きなカード。テープで貼った写真つきのメモ */
function OtherCard({ result, main, order, onPick }: { result: DiagnosisResult; main: DiagnosisResult; order: number; onPick: () => void }) {
  const { recipe, match } = result;
  const tilt = (order % 2 ? 1 : -1) * Math.abs(jitter(recipe.id, 0.8, 2.5));
  return (
    <motion.button
      type="button"
      onClick={onPick}
      aria-label={`${recipe.title}（相性${match}%）を見る`}
      className={`relative block bg-[#fff1c2] p-2 pb-3 text-left shadow-[2px_5px_10px_rgba(60,40,20,0.16)] ${order % 2 ? "ml-4 w-[calc(100%-1rem)]" : "w-[calc(100%-0.5rem)]"}`}
      style={{ borderRadius: order % 2 ? "4px 12px 4px 4px" : "3px 4px 14px 3px" }}
      initial={{ opacity: 0, y: 30, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      whileHover={{ rotate: 0, y: -4 }}
      whileTap={{ scale: 0.97 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 160, damping: 16, delay: order * 0.12 }}
    >
      {/* テープ */}
      <span aria-hidden className="absolute -top-2.5 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rotate-[-3deg] bg-white/60 shadow-sm" />
      <span className="relative block aspect-[16/10] overflow-hidden rounded-[2px]">
        {recipe.coverImage ? (
          <Photo src={recipe.coverImage} alt="" sizes="400px" fallback={<PlatePlaceholder title={recipe.title} />} />
        ) : (
          <PlatePlaceholder title={recipe.title} />
        )}
      </span>
      <span className="mt-2 flex items-start gap-2 px-1">
        <span className="min-w-0 flex-1">
          <span className="font-hand block text-[1.25rem] leading-tight text-ink">{recipe.title}</span>
          <span className="mt-0.5 block text-[0.72rem] text-ink/70">{whyClose(result, main, order % 2 === 1)}</span>
        </span>
        {match >= 20 && (
          <span className="font-hand shrink-0 -rotate-6 text-xl leading-none text-[var(--tomato)]">
            {match}
            <span className="text-xs">%</span>
          </span>
        )}
      </span>
      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 px-1 text-[0.66rem] text-ink/55">
        <span>⏱ {recipe.minutes}分</span>
        <CountryChips tags={recipe.tags} />
      </span>
    </motion.button>
  );
}

/** レシピページとコメントへの入口 */
function RecipeLinks({ recipeId, comments }: { recipeId: string; comments: number }) {
  const base = `/recipes/${encodeURIComponent(recipeId)}`;
  return (
    <p className="font-hand mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem]">
      <Link href={base} className="text-ink/70 underline decoration-dotted underline-offset-4 hover:text-ink">
        レシピページへ →
      </Link>
      <Link href={`${base}/comments`} className="text-ink/70 underline decoration-dotted underline-offset-4 hover:text-ink">
        みんなのひとこと（{comments}）
      </Link>
    </p>
  );
}

/** 手描き風の相性メーター */
function MatchMeter({ value }: { value: number }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <span className="text-[0.7rem] font-bold">相性</span>
      <svg viewBox="0 0 200 16" className="h-4 flex-1" aria-hidden>
        <path d="M3 9 Q 50 6 100 9 T 197 8" stroke="rgba(58,47,42,0.12)" strokeWidth="9" fill="none" strokeLinecap="round" />
        <motion.path
          d="M3 9 Q 50 6 100 9 T 197 8"
          stroke="var(--tomato)"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.1, delay: 0.5, ease: "easeOut" }}
        />
      </svg>
      <motion.span
        className="font-hand text-2xl text-[var(--tomato)]"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: -8 }}
        transition={{ delay: 1.3, type: "spring", stiffness: 400, damping: 12 }}
      >
        {value}%
      </motion.span>
    </div>
  );
}

function Reason({ result }: { result: DiagnosisResult }) {
  const { moodReasons, matchedIngredients } = result;
  return (
    <p className="mt-3 text-[0.78rem] leading-relaxed">
      {moodReasons.length > 0 && (
        <>
          {moodReasons.map((r) => (
            <mark key={r} className="mx-0.5 rounded-sm bg-[#ffe27a]/70 px-1 text-ink">
              {r}
            </mark>
          ))}
          な気分
        </>
      )}
      {matchedIngredients.length > 0 && (
        <>
          {moodReasons.length > 0 ? "と、" : ""}冷蔵庫の
          {matchedIngredients.map((r) => (
            <mark key={r} className="mx-0.5 rounded-sm bg-[#d3f2b0] px-1 text-ink">
              {r}
            </mark>
          ))}
        </>
      )}
      {moodReasons.length + matchedIngredients.length > 0 ? "から選んだよ。" : "今日はなんとなく、これ。"}
    </p>
  );
}
