import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthorKeys, getUserPage } from "@/lib/users/read";
import { UserView } from "./_components/UserView";

type Params = { params: Promise<{ id: string }> };

// いまレシピを投稿している作者のページはビルド時に作っておく。それ以外は初めて開かれたときに作られる
export async function generateStaticParams() {
  return (await getAuthorKeys()).map((id) => ({ id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const user = await getUserPage((await params).id);
  if (!user) return { title: "ユーザーが見つかりません" };
  return { title: `${user.name} の冷蔵庫`, description: `${user.name} さんが冷蔵庫に貼ったレシピ ${user.recipes.length} 枚` };
}

export default async function UserPage({ params }: Params) {
  const user = await getUserPage((await params).id);
  if (!user) notFound();
  return <UserView user={user} />;
}
