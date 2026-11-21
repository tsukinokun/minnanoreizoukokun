import Link from "next/link";
import type { Author } from "@/lib/types";
import { userHref } from "@/lib/users/key";
import { Avatar } from "./Avatar";

type Props = {
  author: Author;
  /** アイコンの直径 px */
  size?: number;
  /** false ならリンクにしない（ユーザーページの無い人） */
  link?: boolean;
  prefix?: string;
  /** 名前のうしろに続ける文字（日付など）。狭いときはこちらから省略される */
  suffix?: string;
  className?: string;
};

/** 小さなアイコン付きの作者名。押すとその人の冷蔵庫（/users/[id]）へ */
export function AuthorLink({ author, size = 18, link = true, prefix = "", suffix = "", className = "" }: Props) {
  const body = (
    <>
      <Avatar name={author.name} url={author.avatarUrl} size={size} className="border" />
      <span className="truncate">
        {prefix}
        {author.name}
        {suffix}
      </span>
    </>
  );
  const cls = `inline-flex min-w-0 items-center gap-1 align-middle ${className}`;
  return link ? (
    <Link href={userHref(author)} className={`${cls} underline decoration-dotted underline-offset-2 hover:text-ink`} aria-label={`${author.name}さんの冷蔵庫を見る`}>
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}
