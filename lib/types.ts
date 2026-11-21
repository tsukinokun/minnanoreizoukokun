/**
 * ドメイン型。ユーザー投稿を前提に、将来の Supabase テーブルと同じ形にしている。
 * （supabase/schema.sql と対応）
 */

export type TagWeights = Record<string, number>;

/* ---------- 食材 ---------- */

export type IngredientCategory =
  | "vegetable"
  | "meat"
  | "fish"
  | "egg_dairy"
  | "soy"
  | "grain"
  | "seasoning"
  | "other";

/** ingredients テーブル。ユーザーが自由に追加できるマスタ */
export type Ingredient = {
  id: string;
  name: string;
  /** ひらがな読み（検索用） */
  reading?: string;
  /** 表記ゆれ（例: 鶏もも肉, とりもも） */
  aliases?: string[];
  category: IngredientCategory;
  /** 写真の URL。無ければカテゴリ別の自動イラストになる */
  image?: string | null;
};

/** 冷蔵庫に「ある」と言った食材。マスタに無い自由入力は ingredientId を持たない */
export type PantryItem = {
  ingredientId?: string;
  name: string;
  category?: IngredientCategory;
};

/* ---------- レシピ ---------- */

export type RecipeIngredient = {
  /** マスタの食材を指すとき。調味料や自由記述なら無くてもよい（名前で照合する） */
  ingredientId?: string;
  name: string;
  amount: string;
};

export type RecipeStep = {
  text: string;
  image?: string | null;
};

export type RecipePhoto = {
  url: string;
  caption?: string;
  /** finished: 完成写真 / process: 途中経過 */
  kind: "finished" | "process";
};

/** レシピ・コメントを書いた人。id はアカウントがある人だけ（見本データの作者は名前だけ） */
export type Author = { name: string; id?: string; avatarUrl?: string | null };

export type Recipe = {
  id: string;
  title: string;
  catch: string;
  description?: string;
  author: Author;
  coverImage?: string | null;
  photos: RecipePhoto[];
  minutes: number;
  servings: number;
  tags: TagWeights;
  ingredients: RecipeIngredient[];
  /** 何工程でも入れられる */
  steps: RecipeStep[];
  createdAt: string;
};

/* ---------- 質問 ---------- */

export type QuestionKind = "mood" | "condition";

export type Option = {
  id: string;
  label: string;
  tags: TagWeights;
  /** 任意。無ければマグネットの色だけで見せる */
  emoji?: string;
  image?: string | null;
};

export type Question = {
  id: string;
  kind: QuestionKind;
  text: string;
  note?: string;
  multiple: boolean;
  /** 大きいほど扉に貼られやすい */
  priority?: number;
  options: Option[];
};

/** questionId -> 選んだ optionId の配列 */
export type Answers = Record<string, string[]>;

/* ---------- 診断結果 ---------- */

export type DiagnosisResult = {
  recipe: Recipe;
  /** 0-100 */
  match: number;
  /** 効いた気分・条件のラベル（option.label） */
  moodReasons: string[];
  /** 手持ちと一致したレシピ材料の名前 */
  matchedIngredients: string[];
};

/* ---------- スキ・コメント ---------- */

/** recipe_comments テーブル（作者名つき） */
export type RecipeComment = {
  id: string;
  recipeId: string;
  author: Author;
  body: string;
  photo?: string | null;
  createdAt: string;
};

/** レシピごとのスキとコメントの数 */
export type ReactionCounts = Record<string, { likes: number; comments: number }>;
