import type { Metadata, Viewport } from "next";
import { Klee_One, Noto_Color_Emoji, Zen_Maru_Gothic } from "next/font/google";
import { FlagSupport } from "./_components/FlagSupport";
import "./globals.css";

// 和文フォントはサイズが大きいので preload せず、unicode-range で必要な分だけ読む
const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  weight: ["400", "700"],
  subsets: ["latin"],
  preload: false,
});

const klee = Klee_One({
  variable: "--font-klee",
  weight: ["600"],
  subsets: ["latin"],
  preload: false,
});

// 国旗用。Windows は国旗の絵文字を持っていないので、国旗を出すところ（.font-flag）だけこれを使う
const flagFont = Noto_Color_Emoji({
  variable: "--font-noto-emoji",
  weight: "400",
  subsets: ["emoji"],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "みんなの冷蔵庫くん", template: "%s | みんなの冷蔵庫くん" },
  description: "新しいスキな料理を、あなたに。冷蔵庫から見つける、今日のごはん。",
};

export const viewport: Viewport = {
  themeColor: "#f4ead6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${zenMaru.variable} ${klee.variable} ${flagFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <FlagSupport />
        {children}
      </body>
    </html>
  );
}
