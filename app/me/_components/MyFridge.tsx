"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/app/_components/Avatar";
import { Kitchen } from "@/app/_components/Kitchen";
import { NameTag } from "@/app/_components/NameTag";
import { Photo } from "@/app/_components/Photo";
import { PolaroidGrid } from "@/app/_components/RecipePolaroids";
import { RedPen } from "@/app/recipes/new/_components/bits";
import { updateProfileName } from "@/app/actions/posting";
import { FridgeFace } from "@/app/diagnosis/_components/FridgeFace";
import { loginHref } from "@/lib/auth/next";
import { getMyProfileName } from "@/lib/auth/profile";
import { jitter, pick } from "@/lib/jitter";
import { getFollowCounts, listMyFollows, toggleFollow, type FollowList } from "@/lib/follows/client";
import { setMyAvatar, useMyAvatar } from "@/lib/me/avatar";
import { loadMine, type Mine, type MineComment } from "@/lib/me/client";
import { listMyStocks, toggleStock, type StockList } from "@/lib/stocks/client";
import { signOut } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useAuth } from "@/lib/supabase/useAuth";
import type { Recipe } from "@/lib/types";
import { userHref } from "@/lib/users/key";

type Tab = "stocks" | "posted" | "comments" | "likes" | "follows";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "stocks", label: "ストック", icon: "📎" },
  { id: "posted", label: "投稿", icon: "✎" },
  { id: "comments", label: "ひとこと", icon: "💬" },
  { id: "likes", label: "スキ", icon: "♥" },
  { id: "follows", label: "フォロー", icon: "👥" },
];
const isTab = (v: string): v is Tab => TABS.some((t) => t.id === v);

const NOTE_COLORS = ["#ffe27a", "#ffc2cf", "#bfe3ff", "#d3f2b0"];

/** わたしの冷蔵庫（/me）。ストック・投稿・ひとこと・スキを、冷蔵庫の棚ごとに見られる */
export function MyFridge({ recipes }: { recipes: Recipe[] }) {
  const configured = !!getSupabaseEnv();
  const { session, ready } = useAuth();
  const member = !!session && !session.isAnonymous;
  const uid = session?.userId ?? null;

  const [tab, setTab] = useState<Tab>("stocks");
  const [mine, setMine] = useState<Mine | null>(null);
  const [stocks, setStocks] = useState<StockList | null>(null);
  const [follows, setFollows] = useState<FollowList | null>(null);
  const [followCounts, setFollowCounts] = useState<{ followers: number; following: number } | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // アイコンを変えられるのは、仮保存モードか Google でログインしている人
  const canEditAvatar = !configured || member;
  const avatar = useMyAvatar(uid, ready);

  // #posted などで開いたタブを覚えておく
  useEffect(() => {
    const h = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- location はクライアントでしか読めない
    if (isTab(h)) setTab(h);
  }, []);

  const choose = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  // 自分のものを読む（ログイン状態が決まってから）
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    loadMine(recipes).then((m) => alive && setMine(m));
    listMyStocks(recipes).then((s) => alive && setStocks(s));
    listMyFollows().then((f) => alive && setFollows(f));
    if (uid) getMyProfileName(uid).then((n) => alive && setName(n));
    if (uid && member) getFollowCounts(uid).then((c) => alive && setFollowCounts(c));
    return () => {
      alive = false;
    };
  }, [ready, uid, member, recipes]);

  const saveName = async (raw: string) => {
    if (!session) return "ログインし直してください";
    const res = await updateProfileName(session.accessToken, raw);
    if (!res.ok) return res.message;
    setName(raw.trim());
    return undefined;
  };

  const logout = async () => {
    setBusy(true);
    await signOut().catch(() => undefined);
    setName(null);
    setBusy(false);
  };

  const unstock = async (id: string) => {
    const res = await toggleStock(id, true);
    if (res.ok && stocks?.ok) setStocks({ ok: true, stocks: stocks.stocks.filter((s) => s.recipe.id !== id) });
  };

  const unfollowUser = async (key: string) => {
    if (!follows?.ok) return;
    const user = follows.users.find((u) => u.key === key);
    if (!user) return;
    const res = await toggleFollow({ name: user.name, ...(key.startsWith("name-") ? {} : { id: key }) }, true);
    if (res.ok) {
      setFollows({ ok: true, users: follows.users.filter((u) => u.key !== key) });
      setFollowCounts((c) => (c ? { ...c, following: Math.max(0, c.following - 1) } : c));
    }
  };

  const counts: Record<Tab, number | null> = {
    stocks: stocks?.ok ? stocks.stocks.length : null,
    posted: mine ? mine.posted.length : null,
    comments: mine ? mine.comments.length : null,
    likes: mine ? mine.likes.length : null,
    follows: follows?.ok ? follows.users.length : null,
  };

  return (
    <MotionConfig reducedMotion="user">
      <Kitchen>
        <main className="relative mx-auto w-full max-w-[460px] px-4 pb-16 pt-5">
          <header className="mb-6 flex items-end justify-between">
            <Link href="/diagnosis" className="font-hand text-sm text-ink/60 hover:text-ink">
              ← 冷蔵庫へ
            </Link>
            <h1 className="font-hand -rotate-2 text-[1.25rem] text-ink">わたしの冷蔵庫</h1>
          </header>

          {/* 名札 */}
          {configured && !ready ? (
            <p className="font-hand py-8 text-center text-ink/60">冷蔵庫をたしかめてる…</p>
          ) : (
            <div className="relative pt-4">
              <AvatarPicker name={(configured ? name : null) ?? "ななしの台所"} url={avatar} canEdit={canEditAvatar} />
              <NameTag
                name={configured ? name : null}
                email={member ? session?.email : undefined}
                caption={configured ? "この冷蔵庫の持ち主は" : "この端末の冷蔵庫"}
                onSave={session ? saveName : undefined}
              />
              {member && uid && followCounts && (
                <Link
                  href={userHref({ id: uid, name: name ?? "" })}
                  className="font-hand mx-auto mt-3 flex w-fit items-baseline gap-3 text-[0.8rem] text-ink/70 hover:text-ink"
                >
                  <span>
                    フォロワー <b className="text-[var(--tomato)]">{followCounts.followers}</b>
                  </span>
                  <span>
                    フォロー中 <b className="text-[var(--tomato)]">{followCounts.following}</b>
                  </span>
                  <span className="text-[0.7rem] underline decoration-dotted underline-offset-4">みんなから見たページ →</span>
                </Link>
              )}
              {!configured && (
                <p className="font-hand mt-3 text-center text-[0.75rem] text-ink/60">いまは仮保存モード。この端末に保存したものが並んでいます</p>
              )}
              {configured && !member && <LoginNudge text="Google でログインすると、ストックが使えて、どの端末からでも自分の冷蔵庫になるよ" />}
            </div>
          )}

          {/* 棚のタブ */}
          <nav className="mt-8 flex items-end gap-1 px-1" aria-label="わたしの冷蔵庫の棚">
            {TABS.map((t) => {
              const on = t.id === tab;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  onClick={() => choose(t.id)}
                  aria-pressed={on}
                  className={`font-hand relative min-w-0 flex-1 whitespace-nowrap rounded-t-[12px_10px] border-2 border-b-0 border-ink/15 px-0 pb-1.5 pt-2 text-[0.68rem] ${on ? "z-10 bg-[#f7fbf8] text-ink" : "bg-[#dfeee6] text-ink/60"}`}
                  animate={{ y: on ? -4 : 0, rotate: on ? 0 : jitter(t.id, -1.5, 1.5) }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  <span aria-hidden className="mr-px text-[0.6rem]">
                    {t.icon}
                  </span>
                  {t.label}
                  {!!counts[t.id] && (
                    <span className="absolute -right-1 -top-2 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full bg-[var(--tomato)] px-1 text-[0.6rem] leading-none text-white shadow-[0_1px_0_rgba(0,0,0,0.2)]">
                      {counts[t.id]}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </nav>

          <section className="fridge-door relative -mt-1 min-h-[18rem] rounded-[6px_6px_16px_14px] px-3 pb-6 pt-5">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {tab === "stocks" &&
                  (stocks === null ? (
                    <Loading />
                  ) : !stocks.ok ? (
                    stocks.reason === "login_required" ? (
                      <LoginNudge text="ストックは Google でログインすると使えるよ" />
                    ) : (
                      <Says line={stocks.message} mood="pout" />
                    )
                  ) : stocks.stocks.length === 0 ? (
                    <Says line="まだからっぽ。気になるレシピをクリップしてね" link={{ href: "/diagnosis", label: "冷蔵庫で探す →" }} />
                  ) : (
                    <PolaroidGrid
                      items={stocks.stocks.map((s) => ({ id: s.recipe.id, title: s.recipe.title, coverImage: s.recipe.coverImage, href: `/recipes/${encodeURIComponent(s.recipe.id)}`, at: s.stockedAt }))}
                      onRemove={unstock}
                      removeLabel={(t) => `${t}をストックから外す`}
                    />
                  ))}

                {tab === "posted" &&
                  (mine === null ? (
                    <Loading />
                  ) : mine.posted.length === 0 ? (
                    <Says line="まだ1枚も貼ってないね。得意料理、教えて！" link={{ href: "/recipes/new", label: "レシピを貼る →" }} />
                  ) : (
                    <PolaroidGrid items={mine.posted} />
                  ))}

                {tab === "comments" &&
                  (mine === null ? (
                    <Loading />
                  ) : mine.comments.length === 0 ? (
                    <Says line="ひとことはまだ。作ってみたら感想を貼ってね" link={{ href: "/diagnosis", label: "冷蔵庫へ →" }} />
                  ) : (
                    <ul className="space-y-4">
                      {mine.comments.map((c, i) => (
                        <CommentNote key={c.id} c={c} i={i} />
                      ))}
                    </ul>
                  ))}

                {tab === "likes" &&
                  (mine === null ? (
                    <Loading />
                  ) : mine.likes.length === 0 ? (
                    <Says line="スキはまだ。ハートを押すとここに集まるよ" link={{ href: "/diagnosis", label: "冷蔵庫で探す →" }} />
                  ) : (
                    <PolaroidGrid items={mine.likes} />
                  ))}

                {tab === "follows" &&
                  (follows === null ? (
                    <Loading />
                  ) : !follows.ok ? (
                    follows.reason === "login_required" ? (
                      <LoginNudge text="フォローは Google でログインすると使えるよ" />
                    ) : (
                      <Says line={follows.message} mood="pout" />
                    )
                  ) : follows.users.length === 0 ? (
                    <Says line="まだだれもフォローしてないよ。気になる作者をフォローしてね" link={{ href: "/diagnosis", label: "レシピを探す →" }} />
                  ) : (
                    <ul className="space-y-2.5">
                      <AnimatePresence initial={false}>
                        {follows.users.map((u, i) => (
                          <motion.li
                            key={u.key}
                            layout
                            className="flex items-center gap-3 rounded-[4px_12px_4px_10px] bg-white/85 py-2 pl-2 pr-3 shadow-[1px_3px_6px_rgba(60,40,20,0.12)]"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0, rotate: jitter(u.key, -1.5, 1.5) }}
                            exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                            transition={{ type: "spring", stiffness: 260, damping: 20, delay: Math.min(i, 8) * 0.04 }}
                          >
                            <Link href={u.href} className="flex min-w-0 flex-1 items-center gap-3">
                              <Avatar name={u.name} url={u.avatarUrl} size={40} />
                              <span className="font-hand truncate text-[1rem] text-ink">{u.name}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => unfollowUser(u.key)}
                              aria-label={`${u.name}さんのフォローをやめる`}
                              className="font-hand shrink-0 rounded-full border-2 border-ink/60 px-2 text-[0.65rem] text-ink/70 hover:text-ink"
                            >
                              はずす
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  ))}
              </motion.div>
            </AnimatePresence>
          </section>

          {member && (
            <p className="mt-8 text-center">
              <button type="button" onClick={logout} disabled={busy} className="text-[0.7rem] text-ink/50 underline underline-offset-4 hover:text-ink disabled:opacity-50">
                ログアウト
              </button>
            </p>
          )}
        </main>
      </Kitchen>
    </MotionConfig>
  );
}

/** 名札の左上に貼る、自分のアイコン。タップで写真を選んで変えられる */
function AvatarPicker({ name, url, canEdit }: { name: string; url: string | null; canEdit: boolean }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const change = async (file: File | null) => {
    setSaving(true);
    setError(undefined);
    const res = await setMyAvatar(file);
    setSaving(false);
    if (!res.ok) setError(res.reason === "login_required" ? "アイコンは Google でログインすると変えられます" : res.message);
  };

  return (
    <div className="absolute -top-1 left-0 z-20 flex flex-col items-start">
      <label className={`group relative block ${canEdit ? "cursor-pointer" : "cursor-default"}`} aria-label={canEdit ? "アイコンの写真を選ぶ" : "アイコン"}>
        <motion.span
          className="block"
          animate={{ rotate: saving ? [-8, 8, -8] : -8 }}
          transition={saving ? { duration: 0.5, repeat: Infinity } : { type: "spring" }}
        >
          <Avatar name={name} url={url} size={68} className="border-4" />
        </motion.span>
        {canEdit && (
          <>
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-ink text-[0.7rem] text-white shadow transition-transform group-hover:scale-110"
            >
              📷
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={saving}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) change(f);
              }}
            />
          </>
        )}
      </label>
      {canEdit && url && (
        <button
          type="button"
          onClick={() => change(null)}
          disabled={saving}
          className="font-hand ml-1 mt-1 text-[0.6rem] text-ink/50 underline underline-offset-2 hover:text-ink"
        >
          写真を外す
        </button>
      )}
      <RedPen message={error} />
    </div>
  );
}

function Loading() {
  return (
    <motion.p className="font-hand py-10 text-center text-sm text-ink/55" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }}>
      棚をのぞいてる…
    </motion.p>
  );
}

/** 冷蔵庫くんがひとこと（からっぽのとき・困ったとき） */
function Says({ line, link, mood = "smile" }: { line: string; link?: { href: string; label: string }; mood?: "smile" | "pout" }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <p className="font-hand relative max-w-[16rem] rounded-[14px_16px_14px_12px] border-2 border-ink bg-white px-3 py-1.5 text-[0.82rem] leading-snug text-ink shadow-[2px_2px_0_var(--ink)]">
        {line}
        <svg aria-hidden viewBox="0 0 16 12" className="absolute -bottom-[11px] left-1/2 h-3 w-4 -translate-x-1/2">
          <path d="M1 0 L8 11 L15 0" fill="#fff" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </p>
      <FridgeFace mood={mood} line={line} className="mt-4 w-24" />
      {link && (
        <Link href={link.href} className="font-hand mt-3 text-sm text-ink underline decoration-wavy decoration-[var(--tomato)] underline-offset-4">
          {link.label}
        </Link>
      )}
    </div>
  );
}

function LoginNudge({ text }: { text: string }) {
  return (
    <p className="font-hand mx-auto mt-4 w-[88%] rotate-1 bg-[#ffe27a] px-3 py-2 text-[0.78rem] leading-snug text-ink shadow-[1px_4px_8px_rgba(60,40,20,0.18)]">
      {text}{" "}
      <Link href={loginHref("/me")} className="underline decoration-wavy decoration-[var(--tomato)] underline-offset-4">
        ログイン →
      </Link>
    </p>
  );
}

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}/${d.getDate()}`;
};

function CommentNote({ c, i }: { c: MineComment; i: number }) {
  return (
    <motion.li
      className="relative px-4 pb-3 pt-4 shadow-[1px_4px_8px_rgba(60,40,20,0.15)]"
      style={{ background: pick(c.id, NOTE_COLORS), borderRadius: pick(c.id + "br", ["2px 2px 2px 14px", "2px", "12px 2px 2px 2px"]) }}
      initial={{ opacity: 0, y: 14, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: jitter(c.id, -2, 2) }}
      transition={{ type: "spring", stiffness: 200, damping: 18, delay: Math.min(i, 8) * 0.05 }}
    >
      <span aria-hidden className="absolute -top-2 left-5 h-4 w-4 rounded-full bg-[#e74c3c] shadow-[0_1px_0_rgba(0,0,0,0.3)]" />
      <div className="flex gap-3">
        {c.photo && (
          <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-[3px]">
            <Photo src={c.photo} alt="貼った写真" sizes="64px" />
          </span>
        )}
        <p className="font-hand min-w-0 flex-1 whitespace-pre-wrap break-words text-[0.9rem] leading-snug text-ink">{c.body}</p>
      </div>
      <p className="mt-2 flex items-baseline justify-between gap-2 text-[0.65rem] text-ink/55">
        <Link href={c.href} className="min-w-0 truncate underline decoration-dotted underline-offset-4 hover:text-ink">
          「{c.recipeTitle}」に貼った
        </Link>
        <span className="shrink-0">{shortDate(c.createdAt)}</span>
      </p>
    </motion.li>
  );
}
