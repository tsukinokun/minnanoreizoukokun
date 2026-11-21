-- =====================================================================
-- ユーザーフォローとアイコン。
-- 02_login_stocks.sql のあとに流す（is_own_photo を使う）。
-- 何度流しても大丈夫（既にあるものは作り直すだけ）。
-- =====================================================================

-- ---------- フォロー ----------
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  followee_id  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);

-- 「この人のフォロワー」を数えるため
create index if not exists follows_followee_id_idx on public.follows (followee_id);

alter table public.follows enable row level security;

-- フォロー関係はだれでも読める（フォロワー数を出すため）
drop policy if exists "read follows" on public.follows;
create policy "read follows" on public.follows for select using (true);

-- フォローできるのは Google などでログインした本人だけ（匿名ユーザーは不可）
drop policy if exists "follow as self" on public.follows;
create policy "follow as self" on public.follows
  for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  );

drop policy if exists "unfollow own" on public.follows;
create policy "unfollow own" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- ---------- アイコン（profiles.avatar_url）は自分がアップロードした写真だけ ----------
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id and public.is_own_photo(avatar_url));
