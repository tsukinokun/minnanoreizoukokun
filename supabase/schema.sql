-- =====================================================================
-- みんなの冷蔵庫くん: Supabase テーブル定義
-- data/*.json と lib/types.ts と同じ形。Supabase に適用済み（追加分は 02_login_stocks.sql など）。
--
-- 写真は Storage の公開バケット `recipe-photos` に置き、
-- 各テーブルには公開 URL（または storage のパス）を保存する。
--
-- RLS の方針: だれでも読める / 書けるのは本人だけ
--
-- 流す順番: schema.sql → 02_login_stocks.sql → seed.sql
-- =====================================================================

-- ---------- 投稿者 ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ---------- 食材マスタ（ユーザーが増やせる） ----------
create type public.ingredient_category as enum
  ('vegetable', 'meat', 'fish', 'egg_dairy', 'soy', 'grain', 'seasoning', 'other');

create table public.ingredients (
  id          text primary key default gen_random_uuid()::text, -- 例: 'egg'。ユーザー追加分は uuid 文字列
  name        text not null,
  reading     text,                             -- ひらがな読み（検索用）
  aliases     text[] not null default '{}',     -- 表記ゆれ
  category    public.ingredient_category not null default 'other',
  image       text,                             -- 写真 URL。null なら自動イラスト
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index ingredients_name_key on public.ingredients (name);

-- ---------- レシピ ----------
create table public.recipes (
  id           text primary key default gen_random_uuid()::text,
  title        text not null,
  catch        text not null default '',
  description  text,
  author_id    uuid references public.profiles (id) on delete set null,
  author_name  text,                                  -- author_id が無いとき（初期データ）の作者名
  cover_image  text,
  minutes      int  not null default 15 check (minutes > 0),
  servings     int  not null default 1  check (servings > 0),
  tags         jsonb not null default '{}'::jsonb,   -- { "comfort": 3, "warm": 2 } 診断用の重み
  created_at   timestamptz not null default now()
);

-- 材料。ingredient_id が無くても name で照合する（自由記述・調味料）
create table public.recipe_ingredients (
  id             bigint generated always as identity primary key,
  recipe_id      text not null references public.recipes (id) on delete cascade,
  position       int  not null,
  ingredient_id  text references public.ingredients (id) on delete set null,
  name           text not null,
  amount         text not null default ''
);
create index on public.recipe_ingredients (recipe_id, position);
create index on public.recipe_ingredients (ingredient_id);

-- 手順。何工程でも入る。position で並べる
create table public.recipe_steps (
  id         bigint generated always as identity primary key,
  recipe_id  text not null references public.recipes (id) on delete cascade,
  position   int  not null,
  text       text not null,
  image_url  text,
  unique (recipe_id, position)
);

-- 完成写真・途中経過。他のユーザーの「つくれぽ」もここに入れられる
create table public.recipe_photos (
  id          bigint generated always as identity primary key,
  recipe_id   text not null references public.recipes (id) on delete cascade,
  url         text not null,
  caption     text,
  kind        text not null check (kind in ('finished', 'process')),
  posted_by   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.recipe_photos (recipe_id, created_at);

-- ---------- 診断の質問 ----------
create table public.questions (
  id          text primary key default gen_random_uuid()::text,
  kind        text not null check (kind in ('mood', 'condition')),
  text        text not null,
  note        text,
  multiple    boolean not null default false,
  priority    int not null default 0,          -- 大きいほど扉に貼られやすい
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.question_options (
  id           text not null,
  question_id  text not null references public.questions (id) on delete cascade,
  position     int  not null,
  label        text not null,
  emoji        text,
  image        text,
  tags         jsonb not null default '{}'::jsonb,
  primary key (question_id, id)
);

-- ---------- RLS ----------
alter table public.profiles            enable row level security;
alter table public.ingredients         enable row level security;
alter table public.recipes             enable row level security;
alter table public.recipe_ingredients  enable row level security;
alter table public.recipe_steps        enable row level security;
alter table public.recipe_photos       enable row level security;
alter table public.questions           enable row level security;
alter table public.question_options    enable row level security;

-- 読み取りはだれでも
create policy "read all" on public.profiles           for select using (true);
create policy "read all" on public.ingredients        for select using (true);
create policy "read all" on public.recipes            for select using (true);
create policy "read all" on public.recipe_ingredients for select using (true);
create policy "read all" on public.recipe_steps       for select using (true);
create policy "read all" on public.recipe_photos      for select using (true);
create policy "read all" on public.questions          for select using (true);
create policy "read all" on public.question_options   for select using (true);

-- 書き込みは本人のものだけ（例。子テーブルは親レシピの author で判定）
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "add ingredient" on public.ingredients
  for insert with check (auth.uid() = created_by);

create policy "own recipe" on public.recipes
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "own recipe ingredients" on public.recipe_ingredients
  for all using (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()));

create policy "own recipe steps" on public.recipe_steps
  for all using (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()));

-- 写真はだれでも投稿できる（つくれぽ）。消せるのは投稿者だけ
create policy "post photo" on public.recipe_photos
  for insert with check (auth.uid() = posted_by);
create policy "delete own photo" on public.recipe_photos
  for delete using (auth.uid() = posted_by);

create policy "own question" on public.questions
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "own question options" on public.question_options
  for all using (exists (select 1 from public.questions q where q.id = question_id and q.created_by = auth.uid()))
  with check (exists (select 1 from public.questions q where q.id = question_id and q.created_by = auth.uid()));

-- =====================================================================
-- 投稿まわり（バックエンド追加分）
-- ログインは Supabase の匿名ログイン（Authentication → Sign In / Providers →
-- "Allow anonymous sign-ins" を ON）。匿名ユーザーも role は authenticated になる。
-- =====================================================================

-- ---------- ログインしたら profiles を自動で作る ----------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'ななしの台所'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- レシピ投稿（本体・材料・手順を 1 トランザクションで入れる） ----------
-- security invoker なので RLS がそのまま効く（author_id は必ず本人になる）
create function public.create_recipe(
  p_title        text,
  p_catch        text,
  p_description  text,
  p_minutes      int,
  p_servings     int,
  p_tags         jsonb,
  p_cover_image  text,
  p_ingredients  jsonb,  -- [{ "ingredientId"?: "egg", "name": "卵", "amount": "2個" }]
  p_steps        jsonb   -- [{ "text": "...", "image"?: "https://..." }]
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  text;
begin
  if v_uid is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  insert into public.recipes (title, catch, description, author_id, cover_image, minutes, servings, tags)
  values (p_title, coalesce(p_catch, ''), p_description, v_uid, p_cover_image,
          p_minutes, p_servings, coalesce(p_tags, '{}'::jsonb))
  returning id into v_id;

  insert into public.recipe_ingredients (recipe_id, position, ingredient_id, name, amount)
  select v_id, t.ord - 1, nullif(t.e ->> 'ingredientId', ''), t.e ->> 'name', coalesce(t.e ->> 'amount', '')
  from jsonb_array_elements(p_ingredients) with ordinality as t(e, ord);

  insert into public.recipe_steps (recipe_id, position, text, image_url)
  select v_id, t.ord - 1, t.e ->> 'text', nullif(t.e ->> 'image', '')
  from jsonb_array_elements(p_steps) with ordinality as t(e, ord);

  return v_id;
end;
$$;

revoke execute on function public.create_recipe from public, anon;
grant execute on function public.create_recipe to authenticated;

-- ---------- 写真（Storage） ----------
-- 公開バケット。アップロードは本人のフォルダ（<user id>/...）だけ。5MB まで、画像のみ
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "delete own upload" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos' and owner_id = (select auth.uid()::text));

-- =====================================================================
-- いいね（スキ）・コメント（supabase/migrations/20261121_likes_comments.sql と同じ内容）
-- =====================================================================

-- ---------- スキ（1人1回。もう一度押すと取り消し） ----------
create table if not exists public.recipe_likes (
  recipe_id   text not null references public.recipes (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (recipe_id, user_id)
);
create index if not exists recipe_likes_user_idx on public.recipe_likes (user_id);

-- ---------- コメント（写真は任意。recipe-photos/<user id>/comments/... に置く） ----------
create table if not exists public.recipe_comments (
  id          bigint generated always as identity primary key,
  recipe_id   text not null references public.recipes (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 300),
  photo_url   text,
  created_at  timestamptz not null default now()
);
create index if not exists recipe_comments_recipe_idx on public.recipe_comments (recipe_id, created_at desc);

-- ---------- 件数（レシピ一覧に出す用） ----------
create or replace view public.recipe_reaction_counts
with (security_invoker = true) as
select
  r.id as recipe_id,
  (select count(*) from public.recipe_likes l where l.recipe_id = r.id)::int as likes,
  (select count(*) from public.recipe_comments c where c.recipe_id = r.id)::int as comments
from public.recipes r;

-- ---------- RLS: だれでも読める / 書けるのは本人だけ ----------
alter table public.recipe_likes    enable row level security;
alter table public.recipe_comments enable row level security;

drop policy if exists "read all" on public.recipe_likes;
create policy "read all" on public.recipe_likes for select using (true);
drop policy if exists "like as self" on public.recipe_likes;
create policy "like as self" on public.recipe_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "unlike own" on public.recipe_likes;
create policy "unlike own" on public.recipe_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "read all" on public.recipe_comments;
create policy "read all" on public.recipe_comments for select using (true);
drop policy if exists "comment as self" on public.recipe_comments;
create policy "comment as self" on public.recipe_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "delete own comment" on public.recipe_comments;
create policy "delete own comment" on public.recipe_comments for delete to authenticated using (auth.uid() = user_id);

grant select on public.recipe_reaction_counts to anon, authenticated;
