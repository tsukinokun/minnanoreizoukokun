"use server";

import { updateTag } from "next/cache";
import { dbError, err, signedIn, type ActionError } from "@/lib/supabase/session";
import { isUuid } from "@/lib/users/key";
import { FOLLOWS_TAG } from "@/lib/users/tags";

// フォローの Server Actions。Google などでログインした人だけ使える（ストックと同じ）。
// クライアントからは lib/follows/client.ts 経由で呼ぶ:
//
//   const res = await follow(session.accessToken, userId);   // userId は profiles.id（uuid）
//
// 匿名ログインのままだと { ok: false, error: "login_required" } が返る。

const loginRequired = () => err("login_required", "フォローするには Google でログインしてください");

/** フォローする（もうフォローしていても ok） */
export async function follow(accessToken: string, userId: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  if (auth.isAnonymous) return loginRequired();
  if (!isUuid(userId)) return err("not_found", "ユーザーが見つかりません");
  if (userId.toLowerCase() === auth.userId.toLowerCase()) return err("forbidden", "自分はフォローできません");
  const { error } = await auth.sb.from("follows").insert({ follower_id: auth.userId, followee_id: userId });
  if (error && error.code !== "23505") {
    return error.code === "23503" ? err("not_found", "ユーザーが見つかりません") : dbError(error, "follows");
  }
  updateTag(FOLLOWS_TAG);
  return { ok: true };
}

/** フォローをやめる（していなくても ok） */
export async function unfollow(accessToken: string, userId: unknown): Promise<{ ok: true } | ActionError> {
  const auth = await signedIn(accessToken);
  if ("ok" in auth) return auth;
  if (!isUuid(userId)) return { ok: true };
  const { error } = await auth.sb.from("follows").delete().eq("follower_id", auth.userId).eq("followee_id", userId);
  if (error) return dbError(error, "follows");
  updateTag(FOLLOWS_TAG);
  return { ok: true };
}
