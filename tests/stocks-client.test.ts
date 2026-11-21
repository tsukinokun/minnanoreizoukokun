import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "@/lib/types";

// Supabase 未設定（仮保存モード）のストック。localStorage と Supabase を偽物にする
const supabase = { client: null as unknown };
vi.mock("@/lib/supabase/browser", () => ({ getBrowserSupabase: () => supabase.client }));
const addStock = vi.fn();
const removeStock = vi.fn();
const listStocks = vi.fn();
vi.mock("@/app/actions/stocks", () => ({ addStock, removeStock, listStocks }));

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

const { forgetMyStocks, getMyStocks, listMyStocks, toggleStock, STOCKS_KEY } = await import("@/lib/stocks/client");

const recipe = (id: string) => ({ id, title: id }) as Recipe;
const RECIPES = [recipe("a"), recipe("b"), recipe("c")];

beforeEach(() => {
  store.clear();
  forgetMyStocks();
  supabase.client = null;
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("ストック（仮保存モード）", () => {
  it("ストックすると一覧に入り、外すと消える", async () => {
    expect(await toggleStock("a", false)).toEqual({ ok: true, stocked: true });
    expect((await getMyStocks()).has("a")).toBe(true);
    let list = await listMyStocks(RECIPES);
    expect(list.ok && list.stocks.map((s) => s.recipe.id)).toEqual(["a"]);

    expect(await toggleStock("a", true)).toEqual({ ok: true, stocked: false });
    expect((await getMyStocks()).has("a")).toBe(false);
    list = await listMyStocks(RECIPES);
    expect(list.ok && list.stocks).toEqual([]);
  });

  it("二重にストックしても1件のまま", async () => {
    await toggleStock("a", false);
    await toggleStock("a", false);
    expect(JSON.parse(store.get(STOCKS_KEY)!)).toHaveLength(1);
  });

  it("新しい順に並び、もう無いレシピは出さない", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T10:00:00Z"));
    await toggleStock("a", false);
    vi.setSystemTime(new Date("2026-11-21T10:00:00Z"));
    await toggleStock("c", false);
    await toggleStock("gone", false);
    const list = await listMyStocks(RECIPES);
    expect(list.ok && list.stocks.map((s) => s.recipe.id)).toEqual(["c", "a"]);
  });

  it("壊れた保存データでも落ちない", async () => {
    store.set(STOCKS_KEY, "{broken");
    expect((await getMyStocks()).size).toBe(0);
    const list = await listMyStocks(RECIPES);
    expect(list.ok && list.stocks).toEqual([]);
  });
});

describe("ストック（Supabase あり）", () => {
  const withSession = (session: unknown) => {
    supabase.client = {
      auth: { getSession: async () => ({ data: { session } }) },
      from: () => ({ select: () => ({ eq: async () => ({ data: [] }) }) }),
    };
  };

  it("匿名ならログインを求め、Server Action は呼ばない", async () => {
    withSession({ access_token: "t", user: { id: "u", is_anonymous: true } });
    expect(await toggleStock("a", false)).toEqual({ ok: false, reason: "login_required" });
    expect(await listMyStocks(RECIPES)).toEqual({ ok: false, reason: "login_required" });
    expect(addStock).not.toHaveBeenCalled();
  });

  it("Google ログインならトークン付きで addStock / removeStock を呼ぶ", async () => {
    withSession({ access_token: "tok", user: { id: "u", is_anonymous: false } });
    addStock.mockResolvedValue({ ok: true });
    removeStock.mockResolvedValue({ ok: true });
    expect(await toggleStock("a", false)).toEqual({ ok: true, stocked: true });
    expect(addStock).toHaveBeenCalledWith("tok", "a");
    expect(await toggleStock("a", true)).toEqual({ ok: true, stocked: false });
    expect(removeStock).toHaveBeenCalledWith("tok", "a");
  });

  it("サーバーのエラーはメッセージにして返す", async () => {
    withSession({ access_token: "tok", user: { id: "u", is_anonymous: false } });
    addStock.mockResolvedValue({ ok: false, error: "not_found", message: "レシピが見つかりません" });
    expect(await toggleStock("x", false)).toEqual({ ok: false, reason: "error", message: "レシピが見つかりません" });
    expect((await getMyStocks()).has("x")).toBe(false);
  });
});
