import { cacheLife, cacheTag } from "next/cache";
import usersJson from "@/data/users.json";
import { CACHE_TAGS, getRecipes } from "@/lib/repository";
import { createReadClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/types";
import { parseUserKey, userKey } from "./key";
import { FOLLOWS_TAG, USERS_TAG } from "./tags";

/**
 * ユーザーページ（/users/[id]）のデータ（サーバー側）。
 * - アカウントがある人: profiles と follows の数を Supabase から
 * - 名前しか無い作者（見本データ）: その名前のレシピと、data/users.json の仮のフォロワー数
 * 数分キャッシュし、フォロー・名札・アイコンの Server Action が updateTag で捨てる。
 */

export type UserPage = {
  key: string;
  name: string;
  avatarUrl: string | null;
  /** profiles.id。名前だけの作者には無い */
  id: string | null;
  recipes: Recipe[];
  followers: number;
  following: number;
};

const sampleFollowers = (usersJson as { followers: Record<string, number> }).followers;

export async function getUserPage(rawKey: string): Promise<UserPage | null> {
  "use cache";
  cacheTag(USERS_TAG, FOLLOWS_TAG, CACHE_TAGS.recipes);
  cacheLife("minutes");

  const ref = parseUserKey(rawKey);
  if (!ref) return null;
  const recipes = await getRecipes();

  if (ref.kind === "name") {
    const mine = recipes.filter((r) => !r.author.id && r.author.name === ref.name);
    if (!mine.length) return null;
    return { key: userKey({ name: ref.name }), name: ref.name, avatarUrl: null, id: null, recipes: mine, followers: sampleFollowers[ref.name] ?? 0, following: 0 };
  }

  const sb = createReadClient();
  if (!sb) return null;
  const [profile, followers, following] = await Promise.all([
    sb.from("profiles").select("id, name, avatar_url").eq("id", ref.id).maybeSingle(),
    sb.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", ref.id),
    sb.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", ref.id),
  ]);
  if (profile.error) console.error("[users] profiles の取得に失敗しました", profile.error);
  const p = profile.data as { id: string; name: string; avatar_url: string | null } | null;
  if (!p) return null;
  return {
    key: p.id,
    name: p.name,
    avatarUrl: p.avatar_url,
    id: p.id,
    recipes: recipes.filter((r) => r.author.id === p.id),
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

/** いまレシピを投稿している作者の key（generateStaticParams 用） */
export async function getAuthorKeys(): Promise<string[]> {
  const recipes = await getRecipes();
  return [...new Set(recipes.map((r) => userKey(r.author)))];
}
