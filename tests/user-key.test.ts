import { describe, expect, it } from "vitest";
import { isUuid, parseUserKey, userHref, userKey } from "@/lib/users/key";

const ID = "3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

describe("ユーザーの鍵", () => {
  it("アカウントがある人は id、名前だけの人は name-<名前>", () => {
    expect(userKey({ id: ID, name: "はなこ" })).toBe(ID);
    expect(userKey({ name: "たまご係" })).toBe("name-たまご係");
  });

  it("リンクは URL エンコードする", () => {
    expect(userHref({ name: "たまご係" })).toBe(`/users/${encodeURIComponent("name-たまご係")}`);
    expect(userHref({ id: ID, name: "x" })).toBe(`/users/${ID}`);
  });

  it("URL の id を、アカウントか名前かに戻す", () => {
    expect(parseUserKey(ID)).toEqual({ kind: "account", id: ID });
    expect(parseUserKey(encodeURIComponent("name-たまご係"))).toEqual({ kind: "name", name: "たまご係" });
    expect(parseUserKey("name-たまご係")).toEqual({ kind: "name", name: "たまご係" });
  });

  it("どちらでもない・壊れた id は null", () => {
    expect(parseUserKey("hello")).toBeNull();
    expect(parseUserKey("name-")).toBeNull();
    expect(parseUserKey("%E0%A4%A")).toBeNull();
    expect(parseUserKey("name-" + "あ".repeat(41))).toBeNull();
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});
