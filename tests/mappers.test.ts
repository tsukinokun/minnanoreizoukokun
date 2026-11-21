import { describe, expect, it } from "vitest";
import ingredientsJson from "@/data/ingredients.json";
import questionsJson from "@/data/questions.json";
import recipesJson from "@/data/recipes.json";
import { toIngredient, toIsoString, toQuestion, toRecipe, type IngredientRow, type QuestionRow, type RecipeRow } from "@/lib/supabase/mappers";
import type { Ingredient, Question, Recipe } from "@/lib/types";

const recipes = recipesJson as unknown as Recipe[];
const questions = questionsJson as unknown as Question[];
const ingredients = ingredientsJson as unknown as Ingredient[];

// seed.sql が入れるのと同じ行を作る（Supabase は並び順を保証しないので、わざと逆順にする）
const recipeRow = (r: Recipe): RecipeRow => ({
  id: r.id,
  title: r.title,
  catch: r.catch,
  description: r.description ?? null,
  author_name: r.author.name,
  cover_image: r.coverImage ?? null,
  minutes: r.minutes,
  servings: r.servings,
  tags: r.tags,
  created_at: r.createdAt.replace("Z", "+00:00"),
  author: null,
  recipe_ingredients: r.ingredients
    .map((i, position) => ({ position, ingredient_id: i.ingredientId ?? null, name: i.name, amount: i.amount }))
    .reverse(),
  recipe_steps: r.steps.map((s, position) => ({ position, text: s.text, image_url: s.image ?? null })).reverse(),
  recipe_photos: r.photos
    .map((p, k) => ({ url: p.url, caption: p.caption ?? null, kind: p.kind, created_at: `2026-11-01T00:00:0${k}+00:00` }))
    .reverse(),
});

describe("Supabase の行 → アプリの型", () => {
  it("全レシピが JSON と同じ形に戻る", () => {
    for (const r of recipes) expect(toRecipe(recipeRow(r))).toEqual(r);
  });

  it("投稿者がいればその名前、いなければ author_name、どちらも無ければ既定名", () => {
    const row = recipeRow(recipes[0]);
    expect(toRecipe({ ...row, author: { name: "はなこ" } }).author.name).toBe("はなこ");
    expect(toRecipe({ ...row, author: null, author_name: null }).author.name).toBe("ななしの台所");
  });

  it("全食材が JSON と同じ形に戻る", () => {
    for (const i of ingredients) {
      const row: IngredientRow = { id: i.id, name: i.name, reading: i.reading ?? null, aliases: i.aliases ?? [], category: i.category, image: i.image ?? null };
      expect(toIngredient(row)).toEqual(i);
    }
  });

  it("全質問が JSON と同じ形に戻る", () => {
    for (const q of questions) {
      const row: QuestionRow = {
        id: q.id, kind: q.kind, text: q.text, note: q.note ?? null, multiple: q.multiple, priority: q.priority ?? 0,
        question_options: q.options
          .map((o, position) => ({ id: o.id, position, label: o.label, emoji: o.emoji ?? null, image: o.image ?? null, tags: o.tags }))
          .reverse(),
      };
      expect(toQuestion(row)).toEqual(q);
    }
  });

  it("timestamptz を JSON と同じ書式にそろえる", () => {
    expect(toIsoString("2026-11-01T12:00:00+00:00")).toBe("2026-11-01T12:00:00Z");
    expect(toIsoString("2026-11-01T21:00:00.123456+09:00")).toBe("2026-11-01T12:00:00.123Z");
  });
});

describe("normalizeSupabaseUrl", async () => {
  const { normalizeSupabaseUrl } = await import("@/lib/supabase/env");
  it.each([
    ["https://abc.supabase.co", "https://abc.supabase.co"],
    ["https://abc.supabase.co/", "https://abc.supabase.co"],
    ["https://abc.supabase.co/rest/v1/", "https://abc.supabase.co"],
    ["  https://abc.supabase.co/rest/v1  ", "https://abc.supabase.co"],
  ])("%s → %s", (raw, want) => expect(normalizeSupabaseUrl(raw)).toBe(want));
  it("空や URL でないものは null", () => {
    expect(normalizeSupabaseUrl("")).toBeNull();
    expect(normalizeSupabaseUrl("abc.supabase.co")).toBeNull();
  });
});

describe("select 文", async () => {
  const { RECIPE_SELECT, COMMENT_SELECT } = await import("@/lib/supabase/mappers");
  it("作者にアカウントがあれば id とアイコンも付け、無ければ名前だけ", () => {
    const row = recipeRow(recipes[0]);
    expect(toRecipe({ ...row, author: { id: "u1", name: "はなこ", avatar_url: "https://x/a.png" } }).author).toEqual({
      name: "はなこ",
      id: "u1",
      avatarUrl: "https://x/a.png",
    });
    expect(toRecipe({ ...row, author: { id: "u1", name: "はなこ", avatar_url: null } }).author).toEqual({ name: "はなこ", id: "u1" });
    expect(toRecipe({ ...row, author: null, author_name: "たまご係" }).author).toEqual({ name: "たまご係" });
  });

  it("profiles への埋め込みは外部キーを明示している（PGRST201 対策）", () => {
    for (const select of [RECIPE_SELECT, COMMENT_SELECT]) {
      expect(select).not.toMatch(/profiles\(/);
      expect(select).toMatch(/profiles!\w+_fkey\(id, name, avatar_url\)/);
    }
  });
});
