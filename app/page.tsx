import Link from "next/link";
import { AccountBadge } from "./_components/AccountBadge";

export default function Home() {
  return (
    <main className="kitchen-wall relative grid min-h-dvh place-items-center px-6">
      <div className="max-w-xs text-center">
        <p className="text-xs text-ink/60">新しいスキな料理を、あなたに</p>
        <h1 className="font-hand mt-2 -rotate-2 text-[2.1rem] leading-tight text-ink">
          <span className="block text-xl">みんなの</span>
          <span className="relative inline-block">
            冷蔵庫くん
            {/* 幅だけ伸ばして、高さは一定（文字にかぶらない） */}
            <svg className="absolute -bottom-2 left-0 h-[8px] w-full" viewBox="0 0 40 6" preserveAspectRatio="none" aria-hidden>
              <path d="M1 4 Q 10 1 20 3.5 T 39 2.5" stroke="var(--tomato)" strokeWidth="3" vectorEffect="non-scaling-stroke" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <Link
          href="/diagnosis"
          className="font-hand mt-8 inline-block rotate-2 rounded-[16px_10px_18px_8px] bg-[var(--tomato)] px-6 py-3 text-white shadow-[3px_4px_0_var(--ink)] transition-transform hover:-rotate-1 active:translate-x-0.5 active:translate-y-0.5"
        >
          🧊 冷蔵庫をのぞく
        </Link>
        <Link
          href="/recipes/new"
          className="font-hand mt-5 block -rotate-1 text-sm text-ink/70 underline decoration-[var(--tomato)] decoration-wavy underline-offset-4 hover:text-ink"
        >
          自分のレシピを冷蔵庫に貼る
        </Link>
      </div>
      <AccountBadge className="absolute right-4 top-4" />

    </main>
  );
}
