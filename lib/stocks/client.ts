"use client";

import { addStock, listStocks, removeStock } from "@/app/actions/stocks";
import { getMemberSession } from "@/lib/auth/member";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Recipe } from "@/lib/types";

/**
 * ★ ストックの送信口。画面からはここだけを呼ぶ。
 * - Supabase が設定されていれば: Google でログインした人だけ → Server Action（app/actions/stocks.ts）
 *   匿名・未ログインなら login_required を返す（ストックのためだけに匿名ログインはさせない）
 * - 設定されていなければ: この端末の localStorage に仮保存（スキ・コメントと同じ方針）
 */

export const STOCKS_KEY = "kyounosuki:stocks";

type LocalStock = { recipeId: string; stockedAt: string };
export type StockEntry = { recipe: Recipe; stockedAt: string };
export type StockResult = { ok: true; stocked: boolean } | { ok: false; reason: "login_required" } | { ok: false; reason: "error"; message: string };

const readLocal = (): LocalStock[] => {
  try {
    const v = JSON.parse(localStorage.getItem(STOCKS_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as LocalStock[]).filter((s) => typeof s?.recipeId === "string") : [];
  } catch {
    return [];
  }
};
const writeLocal = (list: LocalStock[]) => {
  try {
    localStorage.setItem(STOCKS_KEY, JSON.stringify(list));
  } catch {
    // 保存できなくても画面は止めない
  }
};

/** Google などでログインしている人のアクセストークン。匿名・未ログインなら null */
const memberToken = async () => (await getMemberSession())?.token ?? null;

let myStocks: Promise<Set<string>> | null = null;

/** 自分がストックしたレシピ id（画面に何個ボタンがあっても1回だけ読む） */
export function getMyStocks(): Promise<Set<string>> {
  myStocks ??= loadMyStocks().catch(() => new Set<string>());
  return myStocks;
}

/** テスト用・ログインし直したとき用 */
export function forgetMyStocks() {
  myStocks = null;
}

async function loadMyStocks(): Promise<Set<string>> {
  const sb = getBrowserSupabase();
  if (!sb) return new Set(readLocal().map((s) => s.recipeId));
  const { data } = await sb.auth.getSession();
  const s = data.session;
  if (!s || s.user.is_anonymous) return new Set();
  const { data: rows } = await sb.from("stocks").select("recipe_id").eq("user_id", s.user.id);
  return new Set((rows ?? []).map((r: { recipe_id: string }) => r.recipe_id));
}

/** stocked: いまストック済みかどうか（押したら反対になる） */
export async function toggleStock(recipeId: string, stocked: boolean): Promise<StockResult> {
  try {
    const mine = await getMyStocks();
    if (!getBrowserSupabase()) {
      const list = readLocal().filter((s) => s.recipeId !== recipeId);
      if (!stocked) list.push({ recipeId, stockedAt: new Date().toISOString() });
      writeLocal(list);
    } else {
      const token = await memberToken();
      if (!token) return { ok: false, reason: "login_required" };
      const res = stocked ? await removeStock(token, recipeId) : await addStock(token, recipeId);
      if (!res.ok) return "error" in res && res.error === "login_required" ?{ ok: false, reason: "login_required" } : { ok: false, reason: "error", message: res.message };
    }
    if (stocked) mine.delete(recipeId);
    else mine.add(recipeId);
    return { ok: true, stocked: !stocked };
  } catch (e) {
    console.error("[toggleStock]", e);
    return { ok: false, reason: "error", message: "うまくストックできませんでした。もう一度どうぞ" };
  }
}

export type StockList = { ok: true; stocks: StockEntry[] } | { ok: false; reason: "login_required" } | { ok: false; reason: "error"; message: string };

/** 自分のストック（新しい順）。仮保存モードでは recipes から引く */
export async function listMyStocks(recipes: Recipe[]): Promise<StockList> {
  try {
    if (!getBrowserSupabase()) {
      const byId = new Map(recipes.map((r) => [r.id, r]));
      const stocks = readLocal()
        .sort((a, b) => b.stockedAt.localeCompare(a.stockedAt))
        .flatMap((s) => {
          const recipe = byId.get(s.recipeId);
          return recipe ? [{ recipe, stockedAt: s.stockedAt }] : [];
        });
      return { ok: true, stocks };
    }
    const token = await memberToken();
    if (!token) return { ok: false, reason: "login_required" };
    const res = await listStocks(token);
    return res.ok ? res : { ok: false, reason: "error", message: res.message };
  } catch (e) {
    console.error("[listMyStocks]", e);
    return { ok: false, reason: "error", message: "ストックを読めませんでした" };
  }
}
