"use client";

import { getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Google などでログインしている人のセッション。匿名・未ログイン・Supabase 未設定なら null。
 * ストック・フォロー・アイコンは、この人だけが使える。
 */
export async function getMemberSession(): Promise<{ token: string; userId: string } | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  const s = data.session;
  return s && !s.user.is_anonymous ? { token: s.access_token, userId: s.user.id } : null;
}
