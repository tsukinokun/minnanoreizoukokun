import type { Author } from "@/lib/types";

/**
 * ユーザーを指す鍵（/users/[id] の id）。
 * - アカウントがある人: profiles.id（uuid）
 * - 見本データの作者など、名前しか無い人: "name-<名前>"
 */
const NAME_PREFIX = "name-";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UserRef = { kind: "account"; id: string } | { kind: "name"; name: string };

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export function userKey(author: Pick<Author, "id" | "name">): string {
  return author.id ? author.id : NAME_PREFIX + author.name;
}

export function userHref(author: Pick<Author, "id" | "name">): string {
  return `/users/${encodeURIComponent(userKey(author))}`;
}

/** URL の id（デコード前でも後でもよい）を、アカウントか名前かに分ける。どちらでもなければ null */
export function parseUserKey(raw: string): UserRef | null {
  let key = raw;
  try {
    key = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (UUID.test(key)) return { kind: "account", id: key.toLowerCase() };
  if (key.startsWith(NAME_PREFIX)) {
    const name = key.slice(NAME_PREFIX.length).trim();
    return name && name.length <= 40 ? { kind: "name", name } : null;
  }
  return null;
}
