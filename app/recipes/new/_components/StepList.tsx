"use client";

import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { jitter } from "@/lib/jitter";
import { LIMITS } from "../_lib/limits";
import { newStep, type DraftStep } from "../_lib/draft";
import { PhotoPicker, RedPen, Tape } from "./bits";

type Props = {
  steps: DraftStep[];
  error?: string;
  onChange: (steps: DraftStep[]) => void;
  onStepPhoto: (key: string, file: File | null) => void;
};

/** つくりかた。何工程でも足せて、つまみで並べ替えられる。工程ごとに写真も付く */
export function StepList({ steps, error, onChange, onStepPhoto }: Props) {
  const update = (key: string, text: string) => onChange(steps.map((s) => (s.key === key ? { ...s, text } : s)));
  const remove = (key: string) => onChange(steps.length > 1 ? steps.filter((s) => s.key !== key) : [newStep()]);

  return (
    <section aria-labelledby="h-steps" className="relative">
      <div id="h-steps">
        <Tape color="rgba(191,227,255,0.85)" tilt={2}>
          つくりかた <span className="text-xs text-ink/60">（全{steps.length}工程）</span>
        </Tape>
      </div>

      <Reorder.Group axis="y" values={steps} onReorder={onChange} className="mt-3 space-y-2.5">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => (
            <StepRow
              key={s.key}
              step={s}
              index={i}
              onText={(t) => update(s.key, t)}
              onRemove={() => remove(s.key)}
              onPhoto={(f) => onStepPhoto(s.key, f)}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {steps.length < LIMITS.steps.max && (
        <motion.button
          type="button"
          onClick={() => onChange([...steps, newStep()])}
          className="font-hand mt-3 ml-7 rounded-full border-2 border-dashed border-ink/40 px-3 py-1 text-sm text-ink/70"
          whileHover={{ rotate: -2, borderColor: "rgba(58,47,42,0.8)" }}
          whileTap={{ scale: 0.95 }}
        >
          ＋ 工程を足す
        </motion.button>
      )}
      <RedPen message={error} />
    </section>
  );
}

function StepRow({
  step,
  index,
  onText,
  onRemove,
  onPhoto,
}: {
  step: DraftStep;
  index: number;
  onText: (t: string) => void;
  onRemove: () => void;
  onPhoto: (f: File | null) => void;
}) {
  const controls = useDragControls();
  const tilt = jitter(step.key, -10, 10);

  return (
    <Reorder.Item
      value={step}
      dragListener={false}
      dragControls={controls}
      className="relative flex gap-2 rounded-[6px] bg-transparent"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0 }}
      whileDrag={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.9)", boxShadow: "0 8px 16px rgba(0,0,0,0.12)" }}
    >
      {/* 手書きの丸数字。つまむと並べ替え */}
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        aria-label={`工程${index + 1}を並べ替える（ドラッグ）`}
        className="relative grid h-7 w-7 shrink-0 cursor-grab touch-none place-items-center active:cursor-grabbing"
        style={{ rotate: `${tilt}deg` }}
      >
        <svg viewBox="0 0 28 28" className="absolute inset-0" aria-hidden>
          <motion.path
            d="M14 3 C 24 3, 26 12, 25 16 S 18 26, 13 25 S 2 20, 3 13 S 9 2, 16 4"
            fill="none"
            stroke="var(--tomato)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6 }}
          />
        </svg>
        <span className="font-hand text-xs text-[var(--tomato)]">{index + 1}</span>
      </button>

      <div className="min-w-0 flex-1">
        <textarea
          value={step.text}
          onChange={(e) => onText(e.target.value)}
          placeholder={index === 0 ? "たとえば、じゃがいもを一口大に切る" : "つぎは？"}
          aria-label={`工程${index + 1}`}
          rows={1}
          className="lined-input block w-full resize-none bg-transparent text-[0.88rem] leading-[1.75rem] text-ink outline-none placeholder:text-ink/45 [field-sizing:content]"
        />
        {step.photo && (
          <motion.span
            className="relative mt-1 inline-block h-20 w-28 overflow-hidden border-4 border-white shadow-[1px_2px_5px_rgba(0,0,0,0.18)]"
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: jitter(step.key + "p", -4, 4), opacity: 1 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.photo.preview} alt={`工程${index + 1}の写真`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onPhoto(null)}
              aria-label={`工程${index + 1}の写真を外す`}
              className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/80 text-[0.6rem] text-white"
            >
              ×
            </button>
          </motion.span>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
        <PhotoPicker onPick={onPhoto} label={`工程${index + 1}に写真を付ける`} className="grid h-7 w-7 place-items-center rounded-full text-sm opacity-60 hover:bg-black/5 hover:opacity-100">
          📷
        </PhotoPicker>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`工程${index + 1}を消す`}
          className="grid h-7 w-7 place-items-center rounded-full text-ink/40 hover:bg-black/5 hover:text-ink"
        >
          ×
        </button>
      </div>
    </Reorder.Item>
  );
}
