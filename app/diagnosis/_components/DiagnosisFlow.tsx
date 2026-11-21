"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { diagnose } from "@/lib/diagnose";
import { pantryKey, sortByPopularity } from "@/lib/ingredients";
import type { Answers, Ingredient, PantryItem, Question, Recipe, ReactionCounts } from "@/lib/types";
import { CookingTransition } from "./CookingTransition";
import { CuttingBoard } from "./CuttingBoard";
import { DoorNotes } from "./DoorNotes";
import { Fridge } from "./Fridge";
import { FridgeShelves, type FridgeItem } from "./FridgeShelves";
import { Kitchen } from "@/app/_components/Kitchen";
import { PantrySearch } from "./PantrySearch";
import { RecipeCard } from "./RecipeCard";

export type Phase = "door" | "inside" | "cooking" | "result";

type Props = {
  /** 扉に貼る質問（サーバー側で selectQuestions 済み） */
  questions: Question[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  /** レシピごとのスキ・コメント数 */
  counts: ReactionCounts;
};

const toItem = (p: PantryItem, master?: Ingredient): FridgeItem => ({
  key: pantryKey(p),
  ingredientId: p.ingredientId,
  name: master?.name ?? p.name,
  category: master?.category ?? p.category ?? "other",
  image: master?.image,
});

export function DiagnosisFlow({ questions, recipes, ingredients, counts }: Props) {
  const [phase, setPhase] = useState<Phase>("door");
  const [answers, setAnswers] = useState<Answers>({});
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  /** 検索で足した食材。マスタに無い自由入力もここに入る */
  const [added, setAdded] = useState<FridgeItem[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  // 冷蔵庫の中身: 最近足したもの → レシピでよく使われる順
  const stock = useMemo(() => {
    const addedKeys = new Set(added.map((a) => a.key));
    const master = sortByPopularity(ingredients, recipes)
      .map((i) => toItem({ ingredientId: i.id, name: i.name }, i))
      .filter((i) => !addedKeys.has(i.key));
    return [...added, ...master];
  }, [added, ingredients, recipes]);

  const pickedKeys = useMemo(() => new Set(pantry.map(pantryKey)), [pantry]);
  const picked = useMemo(() => {
    const byKey = new Map(stock.map((s) => [s.key, s]));
    return pantry.map((p) => byKey.get(pantryKey(p)) ?? toItem(p));
  }, [pantry, stock]);

  const doorDone = questions.every((q) => answers[q.id]?.length);
  const line = lineFor(phase, doorDone);

  const results = useMemo(
    () => (phase === "result" ? diagnose(questions, answers, pantry, recipes, ingredients) : []),
    [phase, questions, answers, pantry, recipes, ingredients],
  );

  // 調理中の演出が終わったら結果へ
  useEffect(() => {
    if (phase !== "cooking") return;
    const t = setTimeout(() => setPhase("result"), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  const answer = (qid: string, oid: string) => setAnswers((a) => ({ ...a, [qid]: [oid] }));

  const setPicked = (item: FridgeItem, on?: boolean) =>
    setPantry((cur) => {
      const has = cur.some((p) => pantryKey(p) === item.key);
      const next = on ?? !has;
      if (next === has) return cur;
      return next
        ? [...cur, { ingredientId: item.ingredientId, name: item.name, category: item.category }]
        : cur.filter((p) => pantryKey(p) !== item.key);
    });

  const addFromSearch = (p: PantryItem) => {
    const item = toItem(p, p.ingredientId ? byId.get(p.ingredientId) : undefined);
    setAdded((cur) => [item, ...cur.filter((c) => c.key !== item.key)]);
    setPicked(item, true);
  };

  const reset = () => {
    setAnswers({});
    setPantry([]);
    setAdded([]);
    setPhase("door");
  };

  return (
    <MotionConfig reducedMotion="user">
      <Kitchen>
        <div className="relative mx-auto flex h-dvh w-full max-w-[440px] flex-col items-center px-4 pt-6 pb-3">
          <Header line={line} onBack={phase === "inside" ? () => setPhase("door") : undefined} />

          <Fridge
            line={line}
            phase={phase}
            canOpen={doorDone}
            onOpen={() => setPhase("inside")}
            door={
              phase === "door" ? (
                <DoorNotes questions={questions} answers={answers} onAnswer={answer} />
              ) : (
                <CookingTransition active={phase === "cooking" || phase === "result"} />
              )
            }
            interior={
              phase !== "door" && (
                <FridgeShelves
                  items={stock}
                  pickedKeys={pickedKeys}
                  boardRef={boardRef}
                  onDrop={(item) => setPicked(item, true)}
                  onToggle={(item) => setPicked(item)}
                  search={<PantrySearch ingredients={ingredients} onAdd={addFromSearch} />}
                />
              )
            }
          />

          <AnimatePresence>
            {phase === "inside" && (
              <CuttingBoard
                ref={boardRef}
                items={picked}
                onRemove={(item) => setPicked(item, false)}
                onCook={() => setPhase("cooking")}
              />
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {phase === "result" && results.length > 0 && <RecipeCard results={results} counts={counts} onRetry={reset} />}
        </AnimatePresence>
      </Kitchen>
    </MotionConfig>
  );
}

/** 冷蔵庫くんの台詞（一人称は「ぼく」） */
function lineFor(phase: Phase, doorDone: boolean): string {
  switch (phase) {
    case "door":
      return doorDone ? "準備OK！取っ手をひっぱって、ぼくを開けて" : "ぼくのメモに、こたえてね";
    case "inside":
      return "棚は横にスワイプ。使うものは下のまな板へ";
    case "cooking":
      return "ぐつぐつ…いいにおいがしてきた";
    default:
      return "できたよ！";
  }
}

/** onBack があるとき（冷蔵庫を開けている間）は、タイトルの下に「← メモにもどる」を出す */
function Header({ line, onBack }: { line: string; onBack?: () => void }) {
  return (
    <div className="mb-3 flex w-full items-end justify-between gap-3">
      <div className="flex shrink-0 flex-col items-start">
        <h1 className="font-hand shrink-0 whitespace-nowrap pb-1 leading-none text-ink -rotate-2">
          <span className="text-[0.8rem]">みんなの</span>
          <span className="relative ml-0.5 inline-block text-[1.2rem]">
            冷蔵庫くん
            <svg className="absolute -bottom-2 left-0 h-[6px] w-full" viewBox="0 0 40 6" preserveAspectRatio="none" aria-hidden>
              <path
                d="M1 4 Q 10 1 20 3.5 T 39 2.5"
                stroke="var(--tomato)"
                strokeWidth="2.2"
                vectorEffect="non-scaling-stroke"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>
        <AnimatePresence initial={false}>
          {onBack && (
            <motion.button
              type="button"
              onClick={onBack}
              className="font-hand mt-2.5 -rotate-1 overflow-hidden rounded-[3px_8px_3px_6px] bg-[#fff8ea] px-2 py-0.5 text-[0.75rem] text-ink shadow-[1px_2px_4px_rgba(60,40,20,0.18)] hover:-rotate-3"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
              ← メモにもどる
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <SpeechBubble line={line} />
    </div>
  );
}

/** 冷蔵庫くんの吹き出し。しっぽは下の顔のほうを向いていて、台詞は1文字ずつ出る */
function SpeechBubble({ line }: { line: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={line}
        className="font-hand relative mb-1 max-w-[12.5rem] rounded-[14px_16px_14px_12px] border-2 border-ink bg-white px-2.5 py-1 text-[0.74rem] leading-snug text-ink shadow-[2px_2px_0_var(--ink)]"
        initial={{ opacity: 0, scale: 0.6, rotate: 4, y: 6 }}
        animate={{ opacity: 1, scale: 1, rotate: -1.5, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -6, transition: { duration: 0.15 } }}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
        style={{ originX: 0.15, originY: 1 }}
        aria-live="polite"
      >
        {[...line].map((ch, i) => (
          <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 + i * 0.07, duration: 0.01 }}>
            {ch}
          </motion.span>
        ))}
        {/* しっぽ（左下＝冷蔵庫くんの顔のほう） */}
        <svg aria-hidden viewBox="0 0 16 12" className="absolute -bottom-[11px] left-5 h-3 w-4">
          <path d="M1 0 L5 11 L13 0" fill="#fff" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </motion.p>
    </AnimatePresence>
  );
}
