"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountBadge } from "@/app/_components/AccountBadge";
import { AuthorLink } from "@/app/_components/AuthorLink";
import { Kitchen } from "@/app/_components/Kitchen";
import { Photo } from "@/app/_components/Photo";
import { Lightbox, type Zoomed } from "@/app/_components/recipe/RecipeParts";
import { PhotoPicker, RedPen } from "@/app/recipes/new/_components/bits";
import { COMMENT_MAX } from "@/lib/posting/validate";
import { getLocalComments, getMyCommentIds, postComment, reactionMode, removeComment, type ShownComment } from "@/lib/reactions/client";
import { jitter, pick } from "@/lib/jitter";
import type { Recipe, RecipeComment } from "@/lib/types";

type Props = {
  recipe: Pick<Recipe, "id" | "title" | "coverImage">;
  comments: RecipeComment[];
};

const NOTE_COLORS = ["#ffe27a", "#ffc2cf", "#bfe3ff", "#d3f2b0", "#fff8ea"];
const MAGNET_COLORS = ["#ff6b4a", "#3c8dde", "#f2b134", "#59b37a", "#a46be0"];
const NAME_KEY = "kyounosuki:comment-name";

/** 日付は UTC の月/日で出す（サーバーとブラウザで表示がズレないように） */
const dateLabel = (iso: string) => iso.slice(5, 10).replace("-", "/");

/** コメントページ。冷蔵庫の扉がそのままコメント板。文字は付箋、写真はポラロイドで貼る */
export function CommentBoard({ recipe, comments }: Props) {
  const [local, setLocal] = useState<ShownComment[]>([]);
  const [mineIds, setMineIds] = useState<Set<string>>(new Set());
  const [posted, setPosted] = useState<ShownComment[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [zoomed, setZoomed] = useState<Zoomed>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage はクライアントでしか読めない
    setLocal(getLocalComments(recipe.id));
    getMyCommentIds(recipe.id).then(setMineIds);
  }, [recipe.id]);

  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...posted, ...local, ...comments.map((c) => ({ ...c, mine: mineIds.has(c.id) }))]
      .filter((c) => !removed.has(c.id) && !seen.has(c.id) && (seen.add(c.id), true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [posted, local, comments, mineIds, removed]);

  const peel = async (c: ShownComment) => {
    setRemoved((s) => new Set(s).add(c.id));
    const res = await removeComment(c);
    if (!res.ok) {
      setRemoved((s) => {
        const n = new Set(s);
        n.delete(c.id);
        return n;
      });
      alert(res.message);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <Kitchen>
        <main className="relative mx-auto w-full max-w-[460px] px-4 pb-64 pt-5">
          <header className="mb-4 flex items-end justify-between gap-3">
            <Link href={`/recipes/${encodeURIComponent(recipe.id)}`} className="font-hand min-w-0 truncate text-sm text-ink/60 hover:text-ink">
              ← {recipe.title}
            </Link>
            <h1 className="font-hand shrink-0 -rotate-2 text-[1.2rem] text-ink">
              みんなのひとこと <span className="text-[var(--tomato)]">{all.length}</span>
            </h1>
          </header>

          {/* 冷蔵庫の扉＝コメント板 */}
          <div className="fridge-door relative min-h-[60dvh] rounded-[18px_22px_12px_14px] px-3 pb-6 pt-6">
            {/* 名札（ログイン）。扉のふちに貼ってある */}
            <AccountBadge className="absolute -top-3 left-4 z-20" />
            <span aria-hidden className="absolute right-2.5 top-[10%] h-[28%] max-h-60 w-[9px] rounded-full bg-[var(--chrome)] shadow-[1px_2px_0_rgba(0,0,0,0.18)]" />
            {all.length === 0 && (
              <motion.p
                className="font-hand mx-auto mt-16 w-fit rotate-2 bg-[#fff8ea] px-4 py-5 text-center text-sm text-ink/70 shadow-[2px_6px_10px_rgba(60,40,20,0.15)]"
              >
                まだだれも貼ってない。
                <br />
                最初のひとことをどうぞ ↓
              </motion.p>
            )}
            <div className="columns-2 gap-3 pr-5">
              <AnimatePresence initial={false}>
                {all.map((c, i) => (
                  <Note key={c.id} comment={c} index={i} onZoom={setZoomed} onPeel={() => peel(c)} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </main>

        <Composer recipeId={recipe.id} onPosted={(c) => setPosted((p) => [c, ...p])} />
        <Lightbox zoomed={zoomed} onClose={() => setZoomed(null)} />
      </Kitchen>
    </MotionConfig>
  );
}

function Note({ comment: c, index, onZoom, onPeel }: { comment: ShownComment; index: number; onZoom: (z: Zoomed) => void; onPeel: () => void }) {
  const tilt = jitter(c.id + "tilt", -5, 5);
  const fresh = c.mine && index === 0;
  const photo = c.photo;

  return (
    <motion.figure
      layout
      className="relative mb-4 inline-block w-full break-inside-avoid"
      initial={fresh ? { y: 420, scale: 1.4, rotate: -20, opacity: 0 } : { opacity: 0, y: 16, rotate: tilt - 6 }}
      animate={{ y: 0, scale: 1, rotate: tilt, opacity: 1 }}
      exit={{ y: 60, rotate: tilt + 25, opacity: 0, transition: { duration: 0.45 } }}
      transition={{ type: "spring", stiffness: fresh ? 110 : 220, damping: fresh ? 13 : 18, delay: fresh ? 0 : Math.min(index, 8) * 0.04 }}
      style={{ marginTop: jitter(c.id + "mt", 0, 10) }}
    >
      {photo ? (
        // 写真付きはポラロイド
        <div className="bg-white p-1.5 pb-2 shadow-[2px_5px_9px_rgba(0,0,0,0.16)]">
          <span aria-hidden className="absolute -top-2 left-1/2 z-10 h-4 w-14 -translate-x-1/2 rotate-[-4deg] bg-[rgba(255,226,122,0.75)]" />
          <button
            type="button"
            onClick={() => onZoom({ url: photo, caption: c.body, id: `comment-${c.id}` })}
            className="block w-full"
            aria-label="写真を大きく見る"
          >
            <motion.span layoutId={`comment-${c.id}`} className="relative block aspect-square overflow-hidden bg-[#f3eadb]">
              <Photo src={photo} alt={`${c.author.name}さんの写真`} sizes="200px" />
            </motion.span>
          </button>
          <figcaption className="font-hand mt-1.5 px-0.5 text-[0.78rem] leading-snug text-ink">{c.body}</figcaption>
          <Meta c={c} onPeel={onPeel} />
        </div>
      ) : (
        // 文字だけは付箋＋マグネット
        <div
          className="px-2.5 pb-2 pt-4 shadow-[1px_4px_7px_rgba(60,40,20,0.14)]"
          style={{ background: pick(c.id, NOTE_COLORS), borderRadius: pick(c.id + "br", ["2px 2px 2px 14px", "2px", "12px 2px 2px 2px"]) }}
        >
          <span
            aria-hidden
            className="absolute -top-1.5 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full shadow-[0_2px_0_rgba(0,0,0,0.25)]"
            style={{ background: pick(c.id + "mag", MAGNET_COLORS) }}
          />
          <figcaption className="font-hand whitespace-pre-wrap break-words text-[0.85rem] leading-snug text-ink">{c.body}</figcaption>
          <Meta c={c} onPeel={onPeel} />
        </div>
      )}
    </motion.figure>
  );
}

function Meta({ c, onPeel }: { c: ShownComment; onPeel: () => void }) {
  return (
    <p className="mt-1.5 flex items-center justify-between gap-1 text-[0.6rem] text-ink/50">
      {/* アカウントのある人だけ、その人の冷蔵庫へのリンクにする（見本・仮保存のコメントは名前だけ） */}
      <AuthorLink author={c.author} size={16} link={!!c.author.id} suffix={`・${dateLabel(c.createdAt)}`} />

      {c.mine && (
        <button type="button" onClick={onPeel} className="shrink-0 rounded-full px-1.5 py-0.5 text-[var(--tomato)] hover:bg-black/5" aria-label="自分のコメントをはがす">
          はがす
        </button>
      )}
    </p>
  );
}

/** 下に固定したメモ帳。書いて「貼る！」 */
function Composer({ recipeId, onPosted }: { recipeId: string; onPosted: (c: ShownComment) => void }) {
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<{ file: File; preview: string }>();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage はクライアントでしか読めない
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  }, []);

  const left = COMMENT_MAX - [...body.trim()].length;

  const pickPhoto = (file: File | null) => {
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto(file ? { file, preview: URL.createObjectURL(file) } : undefined);
  };

  const send = async () => {
    setError(undefined);
    if (!body.trim()) return setError("ひとこと書いてね");
    if (left < 0) return setError(`${COMMENT_MAX}文字までだよ`);
    setSending(true);
    const res = await postComment({ recipeId, body, photo: photo?.file, name });
    setSending(false);
    if (!res.ok) return setError(res.message);
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {}
    onPosted(res.comment);
    setBody("");
    pickPhoto(null);
    setNotice(res.mode === "local" ? "いまはこの端末にだけ保存しています（Supabase につながったら、みんなに見えます）" : undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[460px] px-3 pb-3"
      initial={{ y: 200 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.3 }}
    >
      <div className="notebook relative rotate-[-0.6deg] px-4 pb-3 pt-4 shadow-[0_-4px_20px_rgba(80,60,40,0.2)]">
        <span aria-hidden className="absolute -top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 bg-[rgba(255,255,255,0.7)] shadow-sm" />
        <AnimatePresence>
          {notice && (
            <motion.p
              role="status"
              className="mb-1.5 text-[0.65rem] leading-snug text-ink/60"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {notice}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="つくってみた？ ひとことどうぞ"
            aria-label="コメント"
            rows={2}
            className="lined-input min-w-0 flex-1 resize-none bg-transparent text-[0.88rem] leading-[1.75rem] text-ink outline-none placeholder:text-ink/30 [field-sizing:content] max-h-32"
          />
          {photo ? (
            <span className="relative h-16 w-16 shrink-0 rotate-3 border-[3px] border-white shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.preview} alt="添える写真" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => pickPhoto(null)}
                aria-label="写真を外す"
                className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-ink text-[0.6rem] text-white"
              >
                ×
              </button>
            </span>
          ) : (
            <PhotoPicker
              onPick={pickPhoto}
              label="写真を添える"
              className="grid h-16 w-14 shrink-0 place-items-center rounded-[4px] border-2 border-dashed border-ink/25 text-center text-[0.6rem] leading-tight text-ink/50 hover:border-ink/50"
            >
              <span>
                📷
                <br />
                写真
              </span>
            </PhotoPicker>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="flex min-w-0 items-baseline gap-1">
            <span className="font-hand text-xs text-ink/60">by</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前（なくてもOK）"
              maxLength={20}
              aria-label="名前"
              className="font-hand w-28 border-b border-ink/30 bg-transparent text-xs text-ink outline-none placeholder:text-ink/30"
            />
          </label>
          <span className={`font-hand ml-auto text-[0.7rem] ${left < 0 ? "text-[#d6362a]" : left < 30 ? "text-[var(--tomato)]" : "text-ink/40"}`} aria-live="polite">
            あと{left}字
          </span>
          <motion.button
            type="button"
            onClick={send}
            disabled={sending}
            className="font-hand shrink-0 rounded-[14px_10px_16px_8px] bg-[var(--tomato)] px-4 py-1.5 text-white shadow-[2px_3px_0_var(--ink)] disabled:opacity-60"
            whileTap={{ x: 2, y: 2, boxShadow: "0px 1px 0 var(--ink)" }}
            animate={sending ? { rotate: [0, -4, 4, 0] } : { rotate: -2 }}
            transition={sending ? { duration: 0.4, repeat: Infinity } : undefined}
          >
            {sending ? "貼ってる…" : "貼る！"}
          </motion.button>
        </div>
        <RedPen message={error} />
        {reactionMode() === "local" && !notice && (
          <p className="mt-1 text-[0.6rem] text-ink/40" suppressHydrationWarning>
            ※ いまは仮保存モード（この端末にだけ保存されます）
          </p>
        )}
      </div>
    </motion.div>
  );
}
