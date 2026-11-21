import { pick } from "@/lib/jitter";
import { Photo } from "./Photo";

const COLORS = ["#ff8f6b", "#5fa8e8", "#f2b134", "#6cc08b", "#b48be8", "#ff8fb1", "#4fbfb0"];

type Props = {
  name: string;
  url?: string | null;
  /** 直径 px */
  size?: number;
  className?: string;
};

/** 丸いマグネットのアイコン。写真があれば写真、無ければ名前の頭文字（色は名前から決まる） */
export function Avatar({ name, url, size = 28, className = "" }: Props) {
  const initial = [...(name.trim() || "?")][0];
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white shadow-[0_2px_0_rgba(0,0,0,0.2)] ${className}`}
      style={{ width: size, height: size, background: pick(name, COLORS) }}
      aria-hidden
    >
      {url ? (
        <Photo src={url} alt="" sizes={`${Math.ceil(size * 2)}px`} fallback={<Initial initial={initial} size={size} />} />
      ) : (
        <Initial initial={initial} size={size} />
      )}
    </span>
  );
}

function Initial({ initial, size }: { initial: string; size: number }) {
  return (
    <span className="font-hand leading-none text-white" style={{ fontSize: size * 0.48 }}>
      {initial}
    </span>
  );
}
