"use client";

import { updateProfileName } from "@/app/actions/posting";
import { addComment, deleteComment as deleteCommentAction, toggleLike as toggleLikeAction } from "@/app/actions/reactions";
import { ensureSignedIn, getBrowserSupabase, uploadPhoto } from "@/lib/supabase/browser";
import { shrinkToDataUrl } from "@/lib/image";
import type { RecipeComment } from "@/lib/types";

/**
 * ★ スキ・コメントの送信口。画面からはここだけを呼ぶ。
 * - Supabase が設定されていれば: 匿名ログイン → Server Action（app/actions/reactions.ts）
 * - 設定されていなければ: この端末の localStorage に仮保存（submitRecipe と同じ方針）
 */

export type Mode = "backend" | "local";
export const reactionMode = (): Mode => (getBrowserSupabase() ? "backend" : "local");

const LIKES_KEY = "kyounosuki:likes";
const COMMENTS_KEY = "kyounosuki:comments";

const readJson = <T>(key: string, fallback: T): T => {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくても画面は止めない
  }
};

/* ---------- スキ ---------- */

let myLikes: Promise<Set<string>> | null = null;

/** 自分がスキしたレシピ（画面に何個ボタンがあっても1回だけ読む） */
export function getMyLikes(): Promise<Set<string>> {
  myLikes ??= loadMyLikes().catch(() => new Set<string>());
  return myLikes;
}

/** 見るだけならログインさせない（セッションが無ければ空） */
async function loadMyLikes(): Promise<Set<string>> {
  const sb = getBrowserSupabase();
  if (!sb) return new Set(readJson<string[]>(LIKES_KEY, []));
  const { data: session } = await sb.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return new Set();
  const { data } = await sb.from("recipe_likes").select("recipe_id").eq("user_id", uid);
  return new Set((data ?? []).map((r: { recipe_id: string }) => r.recipe_id));
}

export type LikeResult = { ok: true; liked: boolean; count: number } | { ok: false; message: string };

/** baseCount: いま画面に出ているスキ数（仮保存のときの計算に使う） */
export async function toggleLike(recipeId: string, liked: boolean, baseCount: number): Promise<LikeResult> {
  try {
    const token = await ensureSignedIn();
    if (!token) {
      const mine = new Set(readJson<string[]>(LIKES_KEY, []));
      if (liked) mine.delete(recipeId);
      else mine.add(recipeId);
      writeJson(LIKES_KEY, [...mine]);
      myLikes = Promise.resolve(mine);
      return { ok: true, liked: !liked, count: Math.max(0, baseCount + (liked ? -1 : 1)) };
    }
    const res = await toggleLikeAction(token, recipeId);
    if (!res.ok) return { ok: false, message: res.message };
    const mine = await getMyLikes();
    if (res.liked) mine.add(recipeId);
    else mine.delete(recipeId);
    return res;
  } catch (e) {
    console.error("[toggleLike]", e);
    return { ok: false, message: "うまく押せませんでした。もう一度どうぞ" };
  }
}

/* ---------- コメント ---------- */

/** 仮保存のコメントに「自分の」印をつけるための型 */
export type ShownComment = RecipeComment & { mine?: boolean };

type LocalComment = RecipeComment;

/** この端末に仮保存したコメント（新しい順） */
export function getLocalComments(recipeId: string): ShownComment[] {
  return readJson<LocalComment[]>(COMMENTS_KEY, [])
    .filter((c) => c.recipeId === recipeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => ({ ...c, mine: true }));
}

/** DB の自分のコメントの id（「はがす」ボタンを出すため）。セッションが無ければ空 */
export async function getMyCommentIds(recipeId: string): Promise<Set<string>> {
  const sb = getBrowserSupabase();
  if (!sb) return new Set();
  const { data: session } = await sb.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return new Set();
  const { data } = await sb.from("recipe_comments").select("id").eq("recipe_id", recipeId).eq("user_id", uid);
  return new Set((data ?? []).map((r: { id: number | string }) => String(r.id)));
}

export type CommentResult = { ok: true; comment: ShownComment; mode: Mode } | { ok: false; message: string };

export async function postComment(input: {
  recipeId: string;
  body: string;
  photo?: File;
  name?: string;
}): Promise<CommentResult> {
  const name = input.name?.trim() || undefined;
  try {
    const token = await ensureSignedIn(name);
    if (!token) {
      const comment: LocalComment = {
        id: `local-${Date.now().toString(36)}`,
        recipeId: input.recipeId,
        author: { name: name ?? "あなた" },
        body: input.body.trim(),
        ...(input.photo ? { photo: await shrinkToDataUrl(input.photo) } : {}),
        createdAt: new Date().toISOString(),
      };
      writeJson(COMMENTS_KEY, [...readJson<LocalComment[]>(COMMENTS_KEY, []), comment]);
      return { ok: true, comment: { ...comment, mine: true }, mode: "local" };
    }
    if (name) await updateProfileName(token, name).catch(() => undefined);
    const photoUrl = input.photo ? await uploadPhoto(input.photo) : undefined;
    const res = await addComment(token, { recipeId: input.recipeId, body: input.body, photoUrl });
    return res.ok ? { ok: true, comment: { ...res.comment, mine: true }, mode: "backend" } : { ok: false, message: res.message };
  } catch (e) {
    console.error("[postComment]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/exceeded the maximum|too large|payload/i.test(msg)) return { ok: false, message: "写真が大きすぎます（5MBまで）" };
    if (/mime type/i.test(msg)) return { ok: false, message: "写真は jpeg / png / webp / gif にしてください" };
    return { ok: false, message: "貼れませんでした。時間をおいて試してください" };
  }
}

export async function removeComment(comment: ShownComment): Promise<{ ok: true } | { ok: false; message: string }> {
  if (comment.id.startsWith("local-")) {
    writeJson(
      COMMENTS_KEY,
      readJson<LocalComment[]>(COMMENTS_KEY, []).filter((c) => c.id !== comment.id),
    );
    return { ok: true };
  }
  try {
    const token = await ensureSignedIn();
    if (!token) return { ok: false, message: "この端末からは消せません" };
    const res = await deleteCommentAction(token, comment.id);
    return res.ok ? res : { ok: false, message: res.message };
  } catch {
    return { ok: false, message: "はがせませんでした。もう一度どうぞ" };
  }
}
