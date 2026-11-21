# みんなの冷蔵庫くん

> まだ「好き」に出会えていない誰かへ。冷蔵庫から見つける、今日のごはん。

**公開版：https://minnanoreizoukokun.vercel.app**

Hack Stage | GROST vol.1（お題「まだ"好き"に出会えていない誰かへ」）の作品です。

## どんなアプリ？

冷蔵庫の扉に貼られたメモに「今日の気分」で答えて、冷蔵庫にある食材をまな板にのせると、今日のあなたに合うレシピを1枚のレシートにして出してくれます。

- いつもの味だけでなく、「冒険してみる？」「どこの国の気分？」に答えると、ガパオライスやシャクシュカのような**海外の家庭料理**にも出会えます
- 作ったレシピは、自分でも「冷蔵庫に貼る」（投稿する）ことができます。だれかの投稿が、また別のだれかの「好き」のきっかけになります

## できること

| 画面 | できること |
| --- | --- |
| トップ（`/`） | 「冷蔵庫をのぞく」から診断へ、「自分のレシピを冷蔵庫に貼る」から投稿へ |
| 冷蔵庫診断（`/diagnosis`） | 気分の質問に答える → 冷蔵庫の食材を選ぶ → 合うレシピが出る（一致度と理由つき） |
| レシピ（`/recipes/[id]`） | 材料・手順・写真を見る、スキする、ストックする |
| ひとこと（`/recipes/[id]/comments`） | レシピへのコメント（写真つきも可） |
| レシピを貼る（`/recipes/new`） | 料理名・材料・手順・写真・気分・国を選んで投稿 |
| ログイン（`/login`） | Google でログイン（ストックに必要） |
| わたしの冷蔵庫（`/me`） | ストックしたレシピ、投稿したレシピ、ひとこと、スキしたレシピ |

- ログインしなくても、診断・投稿・スキ・コメントは使えます（裏側で匿名のアカウントを作っています）。あとから Google でログインすると、それまでの投稿などはそのまま引き継がれます
- **Google ログインは現在「テスト中」のため、登録済みの Google アカウントでしかログインできません**

## はじめから入っているデータ

- レシピ 21 品（日本の家庭料理 3 品 ＋ 13 か国の家庭料理 18 品）
- 診断の質問 10 問、食材 58 種類、国・地域 210

## 技術構成

| | |
| --- | --- |
| フレームワーク | Next.js 16（App Router、Cache Components、Server Actions）／ React 19 ／ TypeScript |
| 見た目 | Tailwind CSS 4 ／ motion |
| バックエンド | Supabase（PostgreSQL、Auth：匿名ログイン・Google、Storage：写真） |
| 公開 | Vercel |
| テスト | Vitest |

- データの読み込みは `lib/repository.ts`。Supabase が設定されていればそこから、無いときやエラーのときは `data/*.json` で動きます
- 書き込み（投稿・スキ・コメント・ストック）は Server Actions から、**ユーザー本人の権限**で行います。他人の名義での書き込みは DB の行レベルセキュリティ（RLS）で拒否します

## ローカルで動かす

必要なもの：Node.js 20.9 以上（Next.js 16 の条件）

```bash
npm install
npm run dev
```

http://localhost:3000 を開きます。

- **Supabase につながなくても動きます**（`data/*.json` を読み込み、投稿はブラウザに仮保存）
- Supabase につなぐときは、`.env.example` を `.env.local` にコピーして、次の 2 つを入れます。値は Supabase の Project Settings で確認できます（`ANON_KEY` には **Publishable key** を入れ、Secret key は入れない）
  - `NEXT_PUBLIC_SUPABASE_URL`（`https://<プロジェクトID>.supabase.co`。後ろに `/rest/v1` などは付けない）
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase のテーブル作成・初期データ・Google ログインの設定は [docs/BACKEND.md](docs/BACKEND.md) を見てください

## npm スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` / `npm start` | 本番ビルド / 本番サーバー |
| `npm run lint` | ESLint |
| `npm test` | テスト（Supabase なしで動く） |
| `npm run check:supabase` | 本物の Supabase につないで、読み込み・投稿・権限を確認する |
| `npm run db:seed` | `data/*.json` から `supabase/seed.sql` を作り直す |

## フォルダ構成

```
app/                 画面（App Router）と Server Actions（app/actions）
  _components/       画面で共通の部品
lib/                 診断ロジック、データ読み込み、Supabase まわり、入力チェック
data/                初期データ（レシピ・質問・食材・国）。Supabase 未設定のときはこれで動く
supabase/            テーブル定義・権限（schema.sql ほか）と初期データ（seed.sql）
tests/               テスト
docs/BACKEND.md      バックエンドの詳しい説明（セットアップ、使い方、セキュリティ）
```
