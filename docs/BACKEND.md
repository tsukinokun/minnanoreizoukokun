# バックエンド（Supabase）

## 全体像

| 役割 | 場所 |
| --- | --- |
| 読み込み（質問・レシピ・食材） | `lib/repository.ts`。Supabase があればそこから、無ければ `data/*.json` |
| DB → アプリの型の変換 | `lib/supabase/mappers.ts` |
| 投稿（レシピ・つくれぽ写真・食材・名前） | `app/actions/posting.ts`（Server Actions） |
| ストック（あとで作りたいレシピ） | `app/actions/stocks.ts`（Server Actions） |
| 匿名ログイン・Google ログイン・写真アップロード（ブラウザ） | `lib/supabase/browser.ts` |
| ログイン状態（React フック） | `lib/supabase/useAuth.ts` |
| 入力チェック | `lib/posting/validate.ts` |
| テーブル定義・RLS・投稿用関数・Storage | `supabase/schema.sql` |
| Google ログイン用の修正・ストックのテーブル・写真 URL の制限 | `supabase/02_login_stocks.sql` |
| 初期データ | `supabase/seed.sql`（`npm run db:seed` で `data/*.json` から生成） |
| スキ・コメント（書き込み） | `app/actions/reactions.ts`（Server Actions）。ブラウザからは `lib/reactions/client.ts` 経由 |
| スキ数・コメント（読み込み） | `lib/reactions/read.ts`。Supabase が無ければ `data/reactions.json`（仮データ） |
| Server Actions 共通の本人確認 | `lib/supabase/session.ts` |

- 読み込みは数分キャッシュします。投稿した直後は Server Action がキャッシュを捨てるので、次の表示から新しいデータが出ます。
- Supabase がエラーを返したときもローカル JSON に切り替えるので、デモ中に画面が止まりません（サーバーのログにエラーが出ます）。

## Supabase のセットアップ

1. SQL Editor で `supabase/schema.sql` → `supabase/02_login_stocks.sql` → `supabase/seed.sql` の順に実行する
   - すでに schema.sql を流した環境では、`supabase/migrations/20261121_likes_comments.sql`（スキ・コメント）→ `supabase/02_login_stocks.sql` の順に追加で流せばよい（どちらも何度流しても大丈夫）
2. Authentication → Sign In / Providers → **Allow anonymous sign-ins** を ON にする（投稿に必要）
3. Google ログイン（ストックに必要）は下の「Google ログインの設定」
4. `.env.example` を `.env.local` にコピーして URL と anon キーを入れる。Vercel でも同じ2つを Environment Variables に入れる
5. `data/*.json` を編集したら `npm run db:seed` で `seed.sql` を作り直し、もう一度 SQL Editor で実行する（何度流しても大丈夫。ユーザーの投稿は消えません）

## Google ログインの設定

1. Google Cloud Console で OAuth クライアント（ウェブ アプリケーション）を作る。「承認済みのリダイレクト URI」に、Supabase の Google 設定画面にある **Callback URL**（`https://<プロジェクトID>.supabase.co/auth/v1/callback`）を入れる
2. Supabase の Authentication → Sign In / Providers → **Google** を ON にして、クライアント ID とシークレットを入れる
3. 同じ画面の **Allow manual linking** を ON にする（匿名から Google に切り替えて、投稿を引き継ぐために必要）
4. Authentication → URL Configuration
   - **Site URL**：公開している URL（例 `https://xxxx.vercel.app`）
   - **Redirect URLs**：`http://localhost:3000/**` と `https://xxxx.vercel.app/**`（ログイン後にもとのページへ戻るため）

## フロントからの使い方（ログイン・ストック）

```tsx
"use client";
import { addStock, listStocks, removeStock } from "@/app/actions/stocks";
import { signInWithGoogle, signOut } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/supabase/useAuth";

const { session, ready, error } = useAuth();  // Google から戻ってきたときの処理もこの中で行う
if (!ready) return null;
if (!session || session.isAnonymous) {
  // 「Google でログイン」ボタン → onClick={() => signInWithGoogle()}
  // 匿名で投稿したことがあれば、同じアカウントのまま Google に切り替わる（投稿は残る）
}

await addStock(session.accessToken, recipe.id);      // ストックする（もう入っていても ok）
await removeStock(session.accessToken, recipe.id);   // 外す
const res = await listStocks(session.accessToken);   // { ok: true, stocks: [{ recipe, stockedAt }] } 新しい順
await signOut();                                     // ログアウト
```

- ストックできるのは Google でログインした人だけです。匿名のままだと `{ ok: false, error: "login_required" }` が返ります
- 自分のストックは自分にしか見えません
- 投稿者名（by ○○）に Google の本名は使いません。名前は投稿画面の入力や `updateProfileName` で決めます
- ログイン後は、ログインボタンを押したページに戻ってきます。そのページでも `useAuth()` を使ってください
- ログイン画面は `/login`（`app/login`）。`/login?next=/recipes/xxx` で、ログインできたらそのページへ戻る（サイト内のパスだけ。`lib/auth/next.ts` の `safeNext`）。トップ・冷蔵庫・レシピ・コメント・投稿のどの画面にも名札マグネット `app/_components/AccountBadge.tsx` があり、そこから入れる（Google ログイン中は `/me` へ。Supabase 未設定のときは「わたしの」として `/me` へ）
- ストックはレシピページと診断結果のクリップ（`app/_components/StockButton.tsx`）から。送信口は `lib/stocks/client.ts`（Google ログインが要る。匿名なら `login_required` でログインの付箋を出す）。Supabase 未設定のときは localStorage `kyounosuki:stocks` に仮保存
- ユーザー画面 `/me`（わたしの冷蔵庫）: 名札・ストック・投稿したレシピ・ひとこと・スキ。読み込みは `lib/me/client.ts`（自分の `recipes.author_id` / `recipe_comments.user_id` / `recipe_likes.user_id` をブラウザから読む）

## フロントからの使い方（投稿）

ログイン画面は不要です。最初の投稿のときに匿名ログインします。
レシピ投稿画面（`/recipes/new`）は `app/recipes/new/_lib/submitRecipe.ts` からこの仕組みを使っています。Supabase 未設定のときは、これまでどおりブラウザに仮保存します。

```tsx
"use client";
import { createRecipe, addRecipePhoto, addIngredient, updateProfileName } from "@/app/actions/posting";
import { ensureSignedIn, uploadPhoto } from "@/lib/supabase/browser";

// レシピを投稿
const token = await ensureSignedIn("はなこ");      // 初回だけ名前が「by はなこ」になる
const cover = file ? await uploadPhoto(file) : undefined; // 写真は先にアップロードして URL をもらう
const res = await createRecipe(token!, {
  title: "卵かけごはん",
  catch: "3分で、いつもの安心",
  minutes: 3,
  servings: 1,
  tags: { quick: 3, comfort: 2, safe: 2 },         // 診断用。キーは questions.json の tags と同じ、重みは 0〜5
  coverImage: cover,
  ingredients: [{ ingredientId: "egg", name: "卵", amount: "1個" }, { name: "しょうゆ", amount: "少々" }],
  steps: [{ text: "ごはんに卵をのせる" }, { text: "しょうゆをかける" }],
});
if (!res.ok) alert(res.message);                   // message はそのまま画面に出せる日本語

// つくれぽ（完成写真・途中経過）
await addRecipePhoto(token!, { recipeId: "gapao", url: await uploadPhoto(file), kind: "finished", caption: "できた！" });

// 食材マスタに追加（同じ名前があればその id が返る）
await addIngredient(token!, { name: "パクチー", reading: "ぱくちー", aliases: ["香菜"], category: "vegetable" });

// 投稿者名を変える
await updateProfileName(token!, "はなこ");
```

- 戻り値は `{ ok: true, ... }` か `{ ok: false, error, message }`
- `error` の種類: `invalid_input`（入力の不備）/ `unauthorized`（ログインし直し）/ `forbidden` / `not_found` / `invalid_reference`（存在しない食材 id など）/ `supabase_not_configured` / `server_error`
- 写真は本人がアップロードしたもの（`recipe-photos/<自分のid>/...`）しか指定できません。5MB まで、jpeg/png/webp/gif
- Supabase 未設定のとき `ensureSignedIn()` は `null` を返します。投稿ボタンを隠すのに使えます

## スキ（いいね）・コメント

- テーブル: `recipe_likes`（1人1レシピ1回。主キー `(recipe_id, user_id)`）と `recipe_comments`（本文1〜300文字、写真は任意）。件数はビュー `recipe_reaction_counts`
- RLS はほかと同じ「だれでも読める / 書けるのは本人だけ」。コメントの写真も本人がアップロードしたものだけ
- **すでに schema.sql を流した Supabase には、`supabase/migrations/20261121_likes_comments.sql` を SQL Editor で1回流す**（何度流しても大丈夫）。新しく作るときは schema.sql だけでよい
- 画面: レシピページ `/recipes/[id]`（スキ・ひとことの入口）、コメントページ `/recipes/[id]/comments`。診断結果のレシートにもスキと入口がある
- Supabase 未設定のときは、スキもコメントもこの端末の localStorage に仮保存（写真は縮めて data URL で保存）。件数とサンプルのコメントは `data/reactions.json`

```tsx
import { toggleLike, postComment, getMyLikes } from "@/lib/reactions/client";
const res = await toggleLike("gapao", /* いまスキしているか */ false, /* いまの数 */ 9); // { ok, liked, count }
await postComment({ recipeId: "gapao", body: "おいしかった", photo: file, name: "はなこ" });
```

## セキュリティ

- 書き込みはすべてユーザー本人の権限で行い、RLS が本人以外の名義を拒否します（service_role キーは使っていません）
- レシピ投稿は `create_recipe` 関数で、本体・材料・手順を 1 トランザクションで入れます。途中で失敗したら何も残りません
- 写真の URL（カバー・手順・つくれぽ・コメント）は、本人がアップロードした写真だけを指定できます。アプリでも DB（`public.is_own_photo`）でも確かめています
- 匿名ログインでも投稿・スキ・コメントはできます（ストックだけは Google ログインが必要）。匿名ユーザーは作り直せるので、スキの水増しは防げません。荒らし対策（通報・削除画面など）はありません

## データ

- `data/recipes.json`: もとの3品 ＋ 海外料理18品（作者「せかいの台所」）。国は `country_xx`（重み3）と `region_xx`（重み2）のタグで持ちます（`lib/countries.ts` の `countryTags` と同じ付け方）。レシピカードの国旗スタンプはこのタグから出ます
- `data/ingredients.json`: 海外料理に必要な食材と調味料を29件追加（調味料は category `seasoning` なので、診断の一致率の分母に入りません）
- レシピの `tags` は、質問で使われているタグと国・地域のタグだけを使っています（テストでチェック）
- `data/*.json` を変えたら、`npm run db:seed` → Supabase の SQL Editor で `supabase/seed.sql` を流し直してください。流し直さないと、Supabase を読む環境では古いデータのままです

## 開発

```bash
npm test          # vitest
npm run db:seed   # data/*.json → supabase/seed.sql
npm run build
```

- ファビコンは冷蔵庫くん。元は `app/icon.svg`。直したら、`app/favicon.ico`（16/32/48px）と `app/apple-icon.png`（180px、背景 #f4ead6）も同じ絵で作り直す（sharp で SVG → PNG にして並べれば作れる）
