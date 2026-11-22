"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { shelfOf, type Shelf } from "@/lib/ingredients";
import { jitter } from "@/lib/jitter";
import type { IngredientCategory } from "@/lib/types";
import { IngredientIcon } from "@/app/_components/IngredientIcon";

/** 冷蔵庫に並ぶ1品。マスタの食材でも、自由入力で足したものでもよい */
export type FridgeItem = {
  key: string;
  ingredientId?: string;
  name: string;
  category?: IngredientCategory;
  image?: string | null;
};

type Props = {
  items: FridgeItem[];
  pickedKeys: Set<string>;
  boardRef: React.RefObject<HTMLDivElement | null>;
  onDrop: (item: FridgeItem) => void;
  onToggle: (item: FridgeItem) => void;
  /** 冷蔵庫上部に差し込む検索欄 */
  search: React.ReactNode;
};

const ROWS: { shelf: Shelf; label?: string }[] = [
  { shelf: "top" },
  { shelf: "middle" },
  { shelf: "drawer", label: "野菜室" },
];

export function FridgeShelves({ items, pickedKeys, boardRef, onDrop, onToggle, search }: Props) {
  const drag = usePullOut(boardRef, onDrop);
  const byShelf = (s: Shelf) => items.filter((i) => shelfOf(i.category) === s);
  const door = byShelf("door");

  return (
    <div className="flex h-full flex-col">
      <div className="relative z-30 shrink-0 px-2 pt-2">{search}</div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {ROWS.map(({ shelf, label }, rowIndex) => (
            <div key={shelf} className={`relative min-h-0 flex-1 ${shelf === "drawer" ? "mx-1 mb-1 rounded-[6px_6px_12px_10px] border border-white/70 bg-[rgba(190,230,215,0.5)]" : ""}`}>
              <div className="no-scrollbar shelf-fade flex h-full snap-x items-end gap-1 overflow-x-auto overflow-y-hidden px-2 pb-1.5 [touch-action:pan-x]">
                {byShelf(shelf).map((item, i) => (
                  <ShelfItem
                    key={item.key}
                    item={item}
                    size={50}
                    delay={0.5 + rowIndex * 0.08 + Math.min(i, 6) * 0.04}
                    picked={pickedKeys.has(item.key)}
                    drag={drag}
                    axis="y"
                    onToggle={onToggle}
                  />
                ))}
                {/* 右端の余白。最後の1品がフェードに埋もれないように */}
                <span className="w-6 shrink-0" />
              </div>
              {shelf !== "drawer" && (
                <div className="pointer-events-none absolute inset-x-1 bottom-0 h-[5px] rounded-full bg-[rgba(160,205,230,0.7)] shadow-[0_2px_3px_rgba(0,0,0,0.08)]" />
              )}
              {label && <span className="font-hand pointer-events-none absolute bottom-0.5 right-2 text-[0.6rem] text-ink/40">{label}</span>}
            </div>
          ))}
        </div>

        {/* ドアポケット（調味料）。縦にスクロール、左へ引っぱると取り出し */}
        {door.length > 0 && (
          <div className="relative my-1 mr-1 w-[4.4rem] shrink-0 rounded-[8px] bg-[rgba(255,255,255,0.55)] shadow-[inset_2px_0_4px_rgba(0,0,0,0.06)]">
            <div className="no-scrollbar flex h-full flex-col items-center gap-0.5 overflow-y-auto py-1.5 [touch-action:pan-y]">
              {door.map((item, i) => (
                <ShelfItem
                  key={item.key}
                  item={item}
                  size={42}
                  delay={0.6 + Math.min(i, 6) * 0.05}
                  picked={pickedKeys.has(item.key)}
                  drag={drag}
                  axis="x"
                  onToggle={onToggle}
                />
              ))}
            </div>
            <span className="font-hand pointer-events-none absolute -top-0.5 left-1 text-[0.55rem] text-ink/40">ポケット</span>
          </div>
        )}
      </div>

      <DragGhost ghost={drag.ghost} />
    </div>
  );
}

type Drag = ReturnType<typeof usePullOut>;

function ShelfItem({
  item,
  size,
  delay,
  picked,
  drag,
  axis,
  onToggle,
}: {
  item: FridgeItem;
  size: number;
  delay: number;
  picked: boolean;
  drag: Drag;
  axis: "x" | "y";
  onToggle: (item: FridgeItem) => void;
}) {
  const tilt = jitter(item.key, -8, 8);
  return (
    <motion.button
      type="button"
      aria-label={picked ? `${item.name}（まな板にのってる。押すと戻す）` : `${item.name}をまな板へ`}
      aria-pressed={picked}
      // 灰色はクラスで切り替える（filter をアニメーションさせると、食材ぜんぶに filter の層ができて重い）
      className={`shrink-0 snap-start select-none px-0.5 ${picked ? "grayscale" : ""}`}
      style={{ marginBottom: jitter(item.key + "mb", 0, 7) }}
      onPointerDown={(e) => !picked && drag.down(e, item, axis)}
      onPointerMove={drag.move}
      onPointerUp={drag.up}
      onPointerCancel={drag.cancel}
      onClick={() => {
        if (drag.consumeClick()) return;
        onToggle(item);
      }}
      initial={{ opacity: 0, y: 14, scale: 0.6 }}
      animate={{
        opacity: picked || drag.ghost?.item.key === item.key ? 0.28 : 1,
        y: 0,
        scale: 1,
        rotate: tilt,
      }}
      whileHover={picked ? undefined : { y: -4, rotate: tilt * 0.4 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 18 }}
    >
      <IngredientIcon name={item.name} category={item.category} image={item.image} size={size} />
    </motion.button>
  );
}

/**
 * 棚の横スクロールとぶつからない「引っぱり出し」ドラッグ。
 * - 棚の段: 横は スクロール、下（縦）に動かしたら取り出し開始
 * - ドアポケット: 縦は スクロール、横に動かしたら取り出し開始
 * 取り出し中は body 直下にゴーストを出すので、overflow で切れない。
 */
function usePullOut(boardRef: Props["boardRef"], onDrop: (item: FridgeItem) => void) {
  const start = useRef<{ x: number; y: number; item: FridgeItem; axis: "x" | "y"; dragging: boolean } | null>(null);
  const suppress = useRef(false);
  const [ghost, setGhost] = useState<{ item: FridgeItem; x: number; y: number } | null>(null);

  const overBoard = (x: number, y: number) => {
    const r = boardRef.current?.getBoundingClientRect();
    return !!r && x > r.left - 16 && x < r.right + 16 && y > r.top - 28 && y < r.bottom + 16;
  };
  const markBoard = (on: boolean) => {
    if (boardRef.current) boardRef.current.dataset.hover = on ? "1" : "";
  };

  return {
    ghost,
    down(e: React.PointerEvent, item: FridgeItem, axis: "x" | "y") {
      if (e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, item, axis, dragging: false };
    },
    move(e: React.PointerEvent) {
      const s = start.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.dragging) {
        const along = s.axis === "y" ? Math.abs(dy) : Math.abs(dx);
        const across = s.axis === "y" ? Math.abs(dx) : Math.abs(dy);
        if (across > 10 && across > along) {
          start.current = null; // スクロールの意図
          return;
        }
        if (along < 8) return;
        s.dragging = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // ポインタがすでに離れている等。キャプチャできなくてもドラッグ自体は続けられる
        }
      }
      setGhost({ item: s.item, x: e.clientX, y: e.clientY });
      markBoard(overBoard(e.clientX, e.clientY));
    },
    up(e: React.PointerEvent) {
      const s = start.current;
      start.current = null;
      if (!s?.dragging) return;
      suppress.current = true;
      if (overBoard(e.clientX, e.clientY)) onDrop(s.item);
      setGhost(null);
      markBoard(false);
    },
    cancel() {
      start.current = null;
      setGhost(null);
      markBoard(false);
    },
    /** ドラッグ直後に発火する click を1回だけ握りつぶす */
    consumeClick() {
      const was = suppress.current;
      suppress.current = false;
      return was;
    },
  };
}

function DragGhost({ ghost }: { ghost: Drag["ghost"] }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {ghost && (
        <motion.div
          key={ghost.item.key}
          className="pointer-events-none fixed left-0 top-0 z-[100] drop-shadow-[0_12px_10px_rgba(0,0,0,0.25)]"
          style={{ x: ghost.x - 34, y: ghost.y - 40 }}
          initial={{ scale: 0.8, rotate: 0 }}
          animate={{ scale: 1.25, rotate: [-6, 6, -6] }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ rotate: { duration: 0.6, repeat: Infinity }, scale: { type: "spring", stiffness: 400, damping: 18 } }}
        >
          <IngredientIcon name={ghost.item.name} category={ghost.item.category} image={ghost.item.image} size={58} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
