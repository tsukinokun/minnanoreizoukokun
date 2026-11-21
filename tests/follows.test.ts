import { beforeEach, describe, expect, it, vi } from "vitest";

// フォローとアイコンの Server Actions の分岐を、Supabase と next/cache を偽物にして確かめる
const updateTag = vi.fn();
vi.mock("next/cache", () => ({ updateTag, cacheTag: vi.fn(), cacheLife: vi.fn() }));

const URL_ = "https://x.supabase.co";
const OWN = `${URL_}/storage/v1/object/public/recipe-photos/u1/`;
const OTHER = `${URL_}/storage/v1/object/public/recipe-photos/u2/`;
const ME = "11111111-1111-4111-8111-111111111111";
const YOU = "22222222-2222-4222-8222-222222222222";

const fake = { getUser: vi.fn(), insert: vi.fn(), del: vi.fn(), update: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createUserClient: () => ({
    auth: { getUser: fake.getUser },
    from: () => ({
      insert: async (row: unknown) => fake.insert(row),
      delete: () => ({ eq: (_c1: string, v1: string) => ({ eq: async (_c2: string, v2: string) => fake.del(v1, v2) }) }),
      update: (row: unknown) => ({ eq: async (_c: string, v: string) => fake.update(row, v) }),
    }),
  }),
}));

const { follow, unfollow } = await import("@/app/actions/follows");
const { updateProfileAvatar } = await import("@/app/actions/posting");
const google = (id = ME) => ({ data: { user: { id, is_anonymous: false } }, error: null });
const anonymous = { data: { user: { id: "a1", is_anonymous: true } }, error: null };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  for (const f of Object.values(fake)) f.mockReset();
  updateTag.mockReset();
  fake.getUser.mockResolvedValue(google());
});

describe("follow", () => {
  it("Google ログイン済みなら自分の名義でフォローし、キャッシュを捨てる", async () => {
    fake.insert.mockReturnValue({ error: null });
    expect(await follow("t", YOU)).toEqual({ ok: true });
    expect(fake.insert).toHaveBeenCalledWith({ follower_id: ME, followee_id: YOU });
    expect(updateTag).toHaveBeenCalledWith("follows");
  });
  it("もうフォロー済みでも ok", async () => {
    fake.insert.mockReturnValue({ error: { code: "23505" } });
    expect(await follow("t", YOU)).toEqual({ ok: true });
  });
  it("匿名ユーザーは login_required（DB には書かない）", async () => {
    fake.getUser.mockResolvedValue(anonymous);
    expect(await follow("t", YOU)).toMatchObject({ ok: false, error: "login_required" });
    expect(fake.insert).not.toHaveBeenCalled();
  });
  it("自分自身・uuid でない相手・いない相手はフォローできない", async () => {
    expect(await follow("t", ME)).toMatchObject({ ok: false, error: "forbidden" });
    expect(await follow("t", "name-たまご係")).toMatchObject({ ok: false, error: "not_found" });
    fake.insert.mockReturnValue({ error: { code: "23503" } });
    expect(await follow("t", YOU)).toMatchObject({ ok: false, error: "not_found" });
  });
});

describe("unfollow", () => {
  it("自分のフォローだけを消す", async () => {
    fake.del.mockReturnValue({ error: null });
    expect(await unfollow("t", YOU)).toEqual({ ok: true });
    expect(fake.del).toHaveBeenCalledWith(ME, YOU);
  });
});

describe("updateProfileAvatar", () => {
  beforeEach(() => fake.getUser.mockResolvedValue(google("u1")));

  it("自分がアップロードした写真ならアイコンにする", async () => {
    fake.update.mockReturnValue({ error: null });
    expect(await updateProfileAvatar("t", OWN + "a.png")).toEqual({ ok: true });
    expect(fake.update).toHaveBeenCalledWith({ avatar_url: OWN + "a.png" }, "u1");
    expect(updateTag).toHaveBeenCalledWith("users");
  });
  it("null で外せる", async () => {
    fake.update.mockReturnValue({ error: null });
    expect(await updateProfileAvatar("t", null)).toEqual({ ok: true });
    expect(fake.update).toHaveBeenCalledWith({ avatar_url: null }, "u1");
  });
  it("他人の写真や外部の URL は入れられない", async () => {
    for (const url of [OTHER + "a.png", "https://evil.example/a.png", OWN + "../u2/a.png", 123]) {
      expect(await updateProfileAvatar("t", url)).toMatchObject({ ok: false, error: "invalid_input" });
    }
    expect(fake.update).not.toHaveBeenCalled();
  });
  it("匿名ユーザーは login_required", async () => {
    fake.getUser.mockResolvedValue(anonymous);
    expect(await updateProfileAvatar("t", null)).toMatchObject({ ok: false, error: "login_required" });
  });
});
