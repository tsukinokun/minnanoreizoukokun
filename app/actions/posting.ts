"use server";

import { updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/repository";
import { USERS_TAG } from "@/lib/users/tags";
import { dbError, err, signedIn, type ActionError } from "@/lib/supabase/session";
import { validateIngredient, validatePhoto, validateProfileName, validateRecipe } from "@/lib/posting/validate";

// 投稿系の Server Actions。クライアントからはこう呼ぶ:
//
//   const token = await ensureSignedIn();          // lib/supabase/browser.ts
//   const res = await createRecipe(token, { ... });
//   if (!res.ok) alert(res.message);
//
// 書き込みはユーザー本人の権限で行うので、他人の名義では書けない（RLS）。
// 成功したら updateTag でキャッシュを捨てるので、次の表示から新しいデータが出る。

// 本人確認とエラーの言い換えは lib/supabase/session.ts（reactions.ts と共通）
export type { ActionError } from "@/lib/supabase/session";

/** レシピを投稿する */
export async function createRecipe(accessToken: string, input: unknown): Promise<{ ok: true; id: string } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const v = validateRecipe(input, auth.isOwnPhoto);
  if (!v.ok) return v;
  const r = v.value;
  const { data, error } = await auth.sb.rpc("create_recipe", {
    p_title: r.title,
    p_catch: r.catch ?? "",
    p_description: r.description ?? null,
    p_minutes: r.minutes,
    p_servings: r.servings,
    p_tags: r.tags,
    p_cover_image: r.coverImage ?? null,
    p_ingredients: r.ingredients,
    p_steps: r.steps,
  });
  if (error) return dbError(error);
  updateTag(CACHE_TAGS.recipes);
  return { ok: true, id: data as string };
}

/** つくれぽ（完成写真・途中経過）をレシピに追加する。先に uploadPhoto で URL を作っておく */
export async function addRecipePhoto(accessToken: string, input: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const v = validatePhoto(input, auth.isOwnPhoto);
  if (!v.ok) return v;
  const p = v.value;
  const { error } = await auth.sb.from("recipe_photos").insert({
    recipe_id: p.recipeId,
    url: p.url,
    caption: p.caption ?? null,
    kind: p.kind,
    posted_by: auth.userId,
  });
  if (error) return error.code === "23503" ? err("not_found", "レシピが見つかりません") : dbError(error);
  updateTag(CACHE_TAGS.recipes);
  return { ok: true };
}

/** 食材マスタに追加する。同じ名前がもうあれば、その食材の id を返す */
export async function addIngredient(
  accessToken: string,
  input: unknown,
): Promise<{ ok: true; id: string; created: boolean } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const v = validateIngredient(input);
  if (!v.ok) return v;
  const i = v.value;
  const { data, error } = await auth.sb
    .from("ingredients")
    .insert({ name: i.name, reading: i.reading ?? null, aliases: i.aliases ?? [], category: i.category, created_by: auth.userId })
    .select("id")
    .single();
  if (error?.code === "23505") {
    const existing = await auth.sb.from("ingredients").select("id").eq("name", i.name).single();
    if (existing.data) return { ok: true, id: existing.data.id as string, created: false };
  }
  if (error) return dbError(error);
  updateTag(CACHE_TAGS.ingredients);
  return { ok: true, id: data.id as string, created: true };
}

/** 投稿者名（by ○○）を変える */
export async function updateProfileName(accessToken: string, name: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  const v = validateProfileName(name);
  if (!v.ok) return v;
  const { error } = await auth.sb.from("profiles").update({ name: v.value }).eq("id", auth.userId);
  if (error) return dbError(error);
  updateTag(CACHE_TAGS.recipes);
  updateTag(USERS_TAG);
  return { ok: true };
}

/** アイコンを変える（null で外す）。写真は自分がアップロードしたものだけ */
export async function updateProfileAvatar(accessToken: string, url: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  if (auth.isAnonymous) return err("login_required", "アイコンは Google でログインすると設定できます");
  if (url !== null && (typeof url !== "string" || !auth.isOwnPhoto(url))) {
    return { ok: false, error: "invalid_input", message: "アイコンの写真をアップロードし直してください" };
  }
  const { error } = await auth.sb.from("profiles").update({ avatar_url: url }).eq("id", auth.userId);
  if (error) return dbError(error);
  updateTag(CACHE_TAGS.recipes);
  updateTag(USERS_TAG);
  return { ok: true };
}
