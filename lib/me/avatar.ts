"use client";

import { useEffect, useState } from "react";
import { updateProfileAvatar } from "@/app/actions/posting";
import { getMemberSession } from "@/lib/auth/member";
import { shrinkToDataUrl } from "@/lib/image";
import { getBrowserSupabase, uploadPhoto } from "@/lib/supabase/browser";

/**
 * 自分のアイコン。
 * - Supabase が設定されていれば: Storage にアップロードして profiles.avatar_url に入れる（Google ログインした人だけ）
 * - 設定されていなければ: 縮めた data URL をこの端末の localStorage に仮保存
 * 変えたら "kyounosuki:avatar" イベントを出すので、useMyAvatar を使っている画面（名札マグネットなど）がすぐ変わる。
 */

export const AVATAR_KEY = "kyounosuki:avatar";
const EVENT = "kyounosuki:avatar";

export async function getMyAvatar(): Promise<string | null> {
  const sb = getBrowserSupabase();
  if (!sb) {
    try {
      return localStorage.getItem(AVATAR_KEY);
    } catch {
      return null;
    }
  }
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return null;
  const { data: row } = await sb.from("profiles").select("avatar_url").eq("id", uid).maybeSingle();
  return (row as { avatar_url?: string | null } | null)?.avatar_url ?? null;
}

export type AvatarResult = { ok: true; url: string | null } | { ok: false; reason: "login_required" } | { ok: false; reason: "error"; message: string };

/** file: 新しいアイコンの写真。null で外す */
export async function setMyAvatar(file: File | null): Promise<AvatarResult> {
  try {
    let url: string | null = null;
    if (!getBrowserSupabase()) {
      url = file ? await shrinkToDataUrl(file, 256) : null;
      try {
        if (url) localStorage.setItem(AVATAR_KEY, url);
        else localStorage.removeItem(AVATAR_KEY);
      } catch {
        return { ok: false, reason: "error", message: "この端末に保存できませんでした" };
      }
    } else {
      const me = await getMemberSession();
      if (!me) return { ok: false, reason: "login_required" };
      url = file ? await uploadPhoto(file) : null;
      const res = await updateProfileAvatar(me.token, url);
      if (!res.ok) return "error" in res && res.error === "login_required" ? { ok: false, reason: "login_required" } : { ok: false, reason: "error", message: res.message };
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: url }));
    return { ok: true, url };
  } catch (e) {
    console.error("[setMyAvatar]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/exceeded the maximum|too large|payload/i.test(msg)) return { ok: false, reason: "error", message: "写真が大きすぎます（5MBまで）" };
    return { ok: false, reason: "error", message: "アイコンを変えられませんでした。もう一度どうぞ" };
  }
}

/** 自分のアイコン（変わったらすぐ反映）。userId が変わったら読み直す */
export function useMyAvatar(userId: string | null | undefined, enabled = true): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    getMyAvatar().then((u) => alive && setUrl(u));
    const onChange = (e: Event) => setUrl((e as CustomEvent<string | null>).detail);
    window.addEventListener(EVENT, onChange);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, onChange);
    };
  }, [userId, enabled]);
  return enabled ? url : null;
}
