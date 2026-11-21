"use client";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import { COMMENT_SELECT, toComment, toIsoString, type CommentRow } from "@/lib/supabase/mappers";
import type { Recipe, RecipeComment } from "@/lib/types";

/**
 * ユーザー画面（/me）で見せる「自分のもの」を読む。
 * - Supabase が設定されていれば: ブラウザの Supabase から自分の行を読む（どれも だれでも読める RLS）
 * - 設定されていなければ: この端末に仮保存したもの（localStorage）
 * レシピ名と写真は、サーバーから渡された recipes を id で引いて付ける。
 */

export type MineRecipe = {
  id: string;
  title: string;
  coverImage?: string | null;
  /** レシピページ。この端末だけの仮保存レシピには無い */
  href: string | null;
  at: string;
};
export type MineComment = RecipeComment & { recipeTitle: string; href: string };
export type Mine = { posted: MineRecipe[]; comments: MineComment[]; likes: MineRecipe[] };

const EMPTY: Mine = { posted: [], comments: [], likes: [] };

const recipeHref = (id: string) => `/recipes/${encodeURIComponent(id)}`;

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
    return Array.isArray(fallback) && !Array.isArray(v) ? fallback : (v ?? fallback);
  } catch {
    return fallback;
  }
};

const byNewest = <T extends { at?: string; createdAt?: string }>(a: T, b: T) =>
  (b.at ?? b.createdAt ?? "").localeCompare(a.at ?? a.createdAt ?? "");

export async function loadMine(recipes: Recipe[]): Promise<Mine> {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const fromRecipe = (id: string, at: string): MineRecipe | null => {
    const r = byId.get(id);
    return r ? { id, title: r.title, coverImage: r.coverImage, href: recipeHref(id), at } : null;
  };
  const withRecipe = (c: RecipeComment): MineComment => ({
    ...c,
    recipeTitle: byId.get(c.recipeId)?.title ?? "どこかのレシピ",
    href: recipeHref(c.recipeId),
  });

  const sb = getBrowserSupabase();
  if (!sb) {
    type LocalPosted = { id: string; postedAt: string; input?: { title?: string; coverImage?: string } };
    const posted = readJson<LocalPosted[]>("kyounosuki:posted-recipes", [])
      .filter((p) => p?.input?.title)
      .map((p) => ({ id: p.id, title: p.input!.title!, coverImage: p.input!.coverImage ?? null, href: null, at: p.postedAt }))
      .sort(byNewest);
    const comments = readJson<RecipeComment[]>("kyounosuki:comments", []).map(withRecipe).sort(byNewest);
    // スキは日時を持っていないので、押した順（新しいものが後ろ）を逆にする
    const likes = readJson<string[]>("kyounosuki:likes", [])
      .slice()
      .reverse()
      .flatMap((id) => fromRecipe(id, "") ?? []);
    return { posted, comments, likes };
  }

  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return EMPTY;

  const [posted, comments, likes] = await Promise.all([
    sb.from("recipes").select("id, title, cover_image, created_at").eq("author_id", uid).order("created_at", { ascending: false }),
    sb.from("recipe_comments").select(COMMENT_SELECT).eq("user_id", uid).order("created_at", { ascending: false }),
    sb.from("recipe_likes").select("recipe_id, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
  ]);

  return {
    posted: ((posted.data ?? []) as { id: string; title: string; cover_image: string | null; created_at: string }[]).map((r) => ({
      id: r.id,
      title: r.title,
      coverImage: r.cover_image,
      href: recipeHref(r.id),
      at: toIsoString(r.created_at),
    })),
    comments: ((comments.data ?? []) as unknown as CommentRow[]).map((row) => withRecipe(toComment(row))),
    likes: ((likes.data ?? []) as { recipe_id: string; created_at: string }[]).flatMap((l) => fromRecipe(l.recipe_id, toIsoString(l.created_at)) ?? []),
  };
}
