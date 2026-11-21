import { beforeEach, describe, expect, it, vi } from "vitest";

// フォローの送信口。localStorage と Supabase、Server Action を偽物にする
const supabase = { client: null as unknown };
vi.mock("@/lib/supabase/browser", () => ({ getBrowserSupabase: () => supabase.client }));
const follow = vi.fn();
const unfollow = vi.fn();
vi.mock("@/app/actions/follows", () => ({ follow, unfollow }));

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

const { forgetMyFollows, getMyFollows, listMyFollows, toggleFollow } = await import("@/lib/follows/client");

const YOU = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  store.clear();
  forgetMyFollows();
  supabase.client = null;
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("フォロー（仮保存モード）", () => {
  it("名前だけの作者もフォローでき、一覧に入り、外すと消える", async () => {
    expect(await toggleFollow({ name: "たまご係" }, false)).toEqual({ ok: true, following: true });
    expect((await getMyFollows()).has("name-たまご係")).toBe(true);
    let list = await listMyFollows();
    expect(list.ok && list.users).toEqual([{ key: "name-たまご係", name: "たまご係", avatarUrl: null, href: `/users/${encodeURIComponent("name-たまご係")}` }]);

    expect(await toggleFollow({ name: "たまご係" }, true)).toEqual({ ok: true, following: false });
    list = await listMyFollows();
    expect(list.ok && list.users).toEqual([]);
  });

  it("新しい順に並ぶ", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T00:00:00Z"));
    await toggleFollow({ name: "A" }, false);
    vi.setSystemTime(new Date("2026-11-21T00:00:00Z"));
    await toggleFollow({ name: "B" }, false);
    const list = await listMyFollows();
    expect(list.ok && list.users.map((u) => u.name)).toEqual(["B", "A"]);
  });
});

describe("フォロー（Supabase あり）", () => {
  const withSession = (session: unknown) => {
    supabase.client = {
      auth: { getSession: async () => ({ data: { session } }) },
      from: () => ({ select: () => ({ eq: async () => ({ data: [] }) }) }),
    };
  };
  const member = { access_token: "tok", user: { id: "me", is_anonymous: false } };

  it("匿名ならログインを求め、Server Action は呼ばない", async () => {
    withSession({ access_token: "t", user: { id: "a", is_anonymous: true } });
    expect(await toggleFollow({ id: YOU, name: "はなこ" }, false)).toEqual({ ok: false, reason: "login_required" });
    expect(follow).not.toHaveBeenCalled();
  });

  it("アカウントの無い作者はフォローできない", async () => {
    withSession(member);
    expect(await toggleFollow({ name: "たまご係" }, false)).toMatchObject({ ok: false, reason: "error" });
    expect(follow).not.toHaveBeenCalled();
  });

  it("Google ログインならトークン付きで follow / unfollow を呼ぶ", async () => {
    withSession(member);
    follow.mockResolvedValue({ ok: true });
    unfollow.mockResolvedValue({ ok: true });
    expect(await toggleFollow({ id: YOU, name: "はなこ" }, false)).toEqual({ ok: true, following: true });
    expect(follow).toHaveBeenCalledWith("tok", YOU);
    expect((await getMyFollows()).has(YOU)).toBe(true);
    expect(await toggleFollow({ id: YOU, name: "はなこ" }, true)).toEqual({ ok: true, following: false });
    expect(unfollow).toHaveBeenCalledWith("tok", YOU);
  });
});
