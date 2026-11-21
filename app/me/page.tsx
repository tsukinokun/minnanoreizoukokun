import type { Metadata } from "next";
import { getRecipes } from "@/lib/repository";
import { MyFridge } from "./_components/MyFridge";

export const metadata: Metadata = {
  title: "わたしの冷蔵庫",
  description: "ストックしたレシピ、投稿したレシピ、貼ったひとこと、スキしたレシピ。",
  robots: { index: false },
};

/** ユーザー画面。中身は人ごとに違うのでクライアントで読む。レシピ名を引くために一覧だけ渡す */
export default async function MePage() {
  const recipes = await getRecipes();
  return <MyFridge recipes={recipes} />;
}
