"use client";

import { follow, unfollow } from "@/app/actions/follows";
import { getMemberSession } from "@/lib/auth/member";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Author } from "@/lib/types";
import { userHref, userKey } from "@/lib/users/key";

/**
 * ★ フォローの送信口。画面からはここだけを呼ぶ。
 * - Supabase が設定されていれば: Google などでログインした人だけ → Server Action（app/actions/follows.ts）
 *   名前しか無い作者（見本データ）はアカウントが無いのでフォローできない
 * - 設定されていなければ: この端末の localStorage に仮保存（ストックと同じ方針）
 */

export const FOLLOWS_KEY = "kyounosuki:follows";

type LocalFollow = { key: string; name: string; avatarUrl?: string | null; followedAt: string };
export type FollowedUser = { key: string; name: string; avatarUrl?: string | null; href: string };
export type FollowResult =
  | { ok: true; following: boolean }
  | { ok: false; reason: "login_required" }
  | { ok: false; reason: "error"; message: string };

const readLocal = (): LocalFollow[] => {
  try {
    const v = JSON.parse(localStorage.getItem(FOLLOWS_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as LocalFollow[]).filter((f) => typeof f?.key === "string" && typeof f?.name === "string") : [];
  } catch {
    return [];
  }
};
const writeLocal = (list: LocalFollow[]) => {
  try {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(list));
  } catch {
    // 保存できなくても画面は止めない
  }
};

let myFollows: Promise<Set<string>> | null = null;

/** 自分がフォローしている人の key（userKey）。画面に何個ボタンがあっても1回だけ読む */
export function getMyFollows(): Promise<Set<string>> {
  myFollows ??= loadMyFollows().catch(() => new Set<string>());
  return myFollows;
}

/** テスト用・ログインし直したとき用 */
export function forgetMyFollows() {
  myFollows = null;
}

async function loadMyFollows(): Promise<Set<string>> {
  const sb = getBrowserSupabase();
  if (!sb) return new Set(readLocal().map((f) => f.key));
  const me = await getMemberSession();
  if (!me) return new Set();
  const { data } = await sb.from("follows").select("followee_id").eq("follower_id", me.userId);
  return new Set((data ?? []).map((r: { followee_id: string }) => r.followee_id));
}

/** following: いまフォローしているか（押したら反対になる） */
export async function toggleFollow(user: Author, following: boolean): Promise<FollowResult> {
  const key = userKey(user);
  try {
    const mine = await getMyFollows();
    if (!getBrowserSupabase()) {
      const list = readLocal().filter((f) => f.key !== key);
      if (!following) list.push({ key, name: user.name, avatarUrl: user.avatarUrl ?? null, followedAt: new Date().toISOString() });
      writeLocal(list);
    } else {
      if (!user.id) return { ok: false, reason: "error", message: "この作者はアカウントが無いので、フォローできません" };
      const me = await getMemberSession();
      if (!me) return { ok: false, reason: "login_required" };
      const res = following ? await unfollow(me.token, user.id) : await follow(me.token, user.id);
      if (!res.ok) {
        return "error" in res && res.error === "login_required" ? { ok: false, reason: "login_required" } : { ok: false, reason: "error", message: res.message };
      }
    }
    if (following) mine.delete(key);
    else mine.add(key);
    return { ok: true, following: !following };
  } catch (e) {
    console.error("[toggleFollow]", e);
    return { ok: false, reason: "error", message: "うまくフォローできませんでした。もう一度どうぞ" };
  }
}

/** アカウントがある人のフォロワー数・フォロー中の数（Supabase ありのときだけ） */
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number } | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const [followers, following] = await Promise.all([
    sb.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", userId),
    sb.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export type FollowList = { ok: true; users: FollowedUser[] } | { ok: false; reason: "login_required" } | { ok: false; reason: "error"; message: string };

/** 自分がフォローしている人（新しい順） */
export async function listMyFollows(): Promise<FollowList> {
  try {
    const sb = getBrowserSupabase();
    if (!sb) {
      const users = readLocal()
        .sort((a, b) => b.followedAt.localeCompare(a.followedAt))
        .map((f) => ({ key: f.key, name: f.name, avatarUrl: f.avatarUrl ?? null, href: `/users/${encodeURIComponent(f.key)}` }));
      return { ok: true, users };
    }
    const me = await getMemberSession();
    if (!me) return { ok: false, reason: "login_required" };
    const { data, error } = await sb
      .from("follows")
      .select("created_at, user:profiles!follows_followee_id_fkey(id, name, avatar_url)")
      .eq("follower_id", me.userId)
      .order("created_at", { ascending: false });
    if (error) return { ok: false, reason: "error", message: "フォローしている人を読めませんでした" };
    const rows = (data ?? []) as unknown as { user: { id: string; name: string; avatar_url: string | null } | null }[];
    return {
      ok: true,
      users: rows.flatMap((r) =>
        r.user ? [{ key: r.user.id, name: r.user.name, avatarUrl: r.user.avatar_url, href: userHref({ id: r.user.id, name: r.user.name }) }] : [],
      ),
    };
  } catch (e) {
    console.error("[listMyFollows]", e);
    return { ok: false, reason: "error", message: "フォローしている人を読めませんでした" };
  }
}
