"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountBadge } from "@/app/_components/AccountBadge";
import { Kitchen } from "@/app/_components/Kitchen";
import type { Ingredient, Question } from "@/lib/types";
import { LIMITS } from "../_lib/limits";
import { checkDraft, emptyDraft, type DraftErrors, type DraftPhoto, type RecipeDraft } from "../_lib/draft";
import { submitRecipe, type SubmitResult } from "../_lib/submitRecipe";
import { RedPen, Stepper } from "./bits";
import { CoverPolaroid } from "./CoverPolaroid";
import { CountryPicker } from "./CountryPicker";
import { IngredientList } from "./IngredientList";
import { MoodMagnets } from "./MoodMagnets";
import { PostedNote } from "./PostedNote";
import { StepList } from "./StepList";
import { TitleNote } from "./TitleNote";

const DRAFT_KEY = "kyounosuki:recipe-draft";
const CUISINE_ID = "cuisine";

type Props = { questions: Question[]; ingredients: Ingredient[] };

export function RecipeForm({ questions, ingredients }: Props) {
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [posted, setPosted] = useState<Extract<SubmitResult, { ok: true }> | null>(null);
  const [failMessage, setFailMessage] = useState<string>();
  const loaded = useRef(false);

  // 国の質問は診断用（地域でざっくり聞く）。投稿では CountryPicker で国そのものを選ぶ
  const moodQuestions = useMemo(() => questions.filter((q) => q.id !== CUISINE_ID), [questions]);
  const errors: DraftErrors = useMemo(() => (showErrors ? checkDraft(draft) : {}), [showErrors, draft]);

  // 下書きを復元（写真はファイルなので復元しない）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage はクライアントでしか読めない
      if (saved) setDraft({ ...emptyDraft(), ...(JSON.parse(saved) as Partial<RecipeDraft>) });
    } catch {
      // 壊れた下書きは無視
    }
    loaded.current = true;
  }, []);

  // 下書きを自動保存
  useEffect(() => {
    if (!loaded.current || posted) return;
    const t = setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { cover, ...rest } = draft;
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...rest, steps: rest.steps.map(({ key, text }) => ({ key, text })) }));
      } catch {
        // 保存できなくても入力は続けられる
      }
    }, 400);
    return () => clearTimeout(t);
  }, [draft, posted]);

  const patch = (p: Partial<RecipeDraft>) => setDraft((d) => ({ ...d, ...p }));

  const photo = (file: File): DraftPhoto => ({ file, preview: URL.createObjectURL(file) });
  const setCover = (file: File | null) =>
    setDraft((d) => {
      if (d.cover) URL.revokeObjectURL(d.cover.preview);
      return { ...d, cover: file ? photo(file) : undefined };
    });
  const setStepPhoto = (key: string, file: File | null) =>
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s) => {
        if (s.key !== key) return s;
        if (s.photo) URL.revokeObjectURL(s.photo.preview);
        return { ...s, photo: file ? photo(file) : undefined };
      }),
    }));

  const toggleMood = (qid: string, oid: string) =>
    setDraft((d) => {
      const cur = d.moods[qid] ?? [];
      return { ...d, moods: { ...d.moods, [qid]: cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid] } };
    });

  const send = async () => {
    setShowErrors(true);
    setFailMessage(undefined);
    const errs = checkDraft(draft);
    const first = Object.keys(errs)[0];
    if (first) {
      document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSending(true);
    const res = await submitRecipe(draft, questions);
    setSending(false);
    if (!res.ok) return setFailMessage(res.message);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setPosted(res);
  };

  const again = () => {
    setDraft(emptyDraft());
    setShowErrors(false);
    setPosted(null);
    window.scrollTo({ top: 0 });
  };

  const errorCount = Object.keys(errors).length;

  return (
    <MotionConfig reducedMotion="user">
      <Kitchen>
        <main className="relative mx-auto w-full max-w-[460px] px-4 pb-32 pt-5">
          <header className="mb-5 flex items-end justify-between">
            <Link href="/diagnosis" className="font-hand text-sm text-ink/60 hover:text-ink">
              ← 冷蔵庫へ
            </Link>
            <AccountBadge className="ml-auto mr-3" />
            <h1 className="font-hand -rotate-2 text-[1.25rem] text-ink">
              レシピを
              <span className="relative mx-0.5 inline-block">
                貼る
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 40 6" aria-hidden>
                  <path d="M1 4 Q 10 1 20 3.5 T 39 2.5" stroke="var(--tomato)" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
          </header>

          <AnimatePresence mode="wait">
            {posted ? (
              <PostedNote key="posted" result={posted} onAgain={again} />
            ) : (
              <motion.div
                key="form"
                className="notebook relative px-4 pb-7 pt-8"
                initial={{ opacity: 0, y: 30, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: -0.6 }}
                exit={{ opacity: 0, scale: 0.35, y: -260, x: 60, rotate: 14, transition: { duration: 0.55, ease: [0.6, 0, 0.8, 0.4] } }}
                transition={{ type: "spring", stiffness: 140, damping: 18 }}
              >
                {/* ノートを留めるテープ */}
                <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 bg-[rgba(255,255,255,0.65)] shadow-sm" />

                <div data-field="title">
                  <TitleNote draft={draft} errors={errors} onChange={patch} />
                </div>

                <div className="mt-6 flex items-start justify-between gap-3">
                  <div className="space-y-3 pt-2">
                    <Stepper
                      label="時間"
                      value={draft.minutes}
                      unit="分"
                      min={LIMITS.minutes.min}
                      max={LIMITS.minutes.max}
                      step={draft.minutes >= 60 ? 10 : 5}
                      onChange={(minutes) => patch({ minutes })}
                    />
                    <Stepper
                      label="分量"
                      value={draft.servings}
                      unit="人分"
                      min={LIMITS.servings.min}
                      max={LIMITS.servings.max}
                      onChange={(servings) => patch({ servings })}
                    />
                  </div>
                  <CoverPolaroid cover={draft.cover} onPick={setCover} onClear={() => setCover(null)} />
                </div>

                <div className="mt-8" data-field="ingredients">
                  <IngredientList
                    master={ingredients}
                    items={draft.ingredients}
                    error={errors.ingredients}
                    onChange={(items) => patch({ ingredients: items })}
                  />
                </div>

                <div className="mt-8" data-field="steps">
                  <StepList
                    steps={draft.steps}
                    error={errors.steps}
                    onChange={(steps) => patch({ steps })}
                    onStepPhoto={setStepPhoto}
                  />
                </div>

                <div className="mt-9">
                  <MoodMagnets questions={moodQuestions} picks={draft.moods} onToggle={toggleMood} />
                </div>

                <div className="mt-9">
                  <CountryPicker picked={draft.countries} onChange={(countries) => patch({ countries })} />
                </div>

                <label className="mt-8 block" data-field="description">
                  <span className="font-hand text-sm text-ink/70">コツ・思い出（なくてもOK）</span>
                  <textarea
                    value={draft.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    placeholder="失敗しても、上からケチャップで描けば大丈夫。"
                    rows={2}
                    className="lined-input mt-1 block w-full resize-none bg-transparent text-[0.88rem] leading-[1.75rem] text-ink outline-none placeholder:text-ink/45 [field-sizing:content]"
                  />
                  <RedPen message={errors.description} />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {!posted && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center pb-4">
            <AnimatePresence>
              {(errorCount > 0 || failMessage) && (
                <motion.p
                  className="font-hand pointer-events-auto mb-2 rounded-full bg-white px-3 py-1 text-[0.8rem] text-[#d6362a] shadow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                >
                  {failMessage ?? `赤ペンのところが${errorCount}つあるよ`}
                </motion.p>
              )}
            </AnimatePresence>
            <motion.button
              type="button"
              onClick={send}
              disabled={sending}
              className="font-hand pointer-events-auto relative flex items-center gap-2 rounded-[18px_12px_20px_10px] bg-[var(--tomato)] px-6 py-3 text-lg text-white shadow-[3px_4px_0_var(--ink)] disabled:opacity-70"
              initial={{ y: 80 }}
              animate={{ y: 0, rotate: sending ? [0, -3, 3, 0] : -1.5 }}
              transition={sending ? { rotate: { duration: 0.4, repeat: Infinity } } : { type: "spring", stiffness: 200, damping: 16 }}
              whileHover={{ rotate: 1, y: -2 }}
              whileTap={{ x: 2, y: 3, boxShadow: "0px 1px 0 var(--ink)" }}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-sm" aria-hidden>
                🧲
              </span>
              {sending ? "貼ってるところ…" : "冷蔵庫に貼る！"}
            </motion.button>
          </div>
        )}
      </Kitchen>
    </MotionConfig>
  );
}
