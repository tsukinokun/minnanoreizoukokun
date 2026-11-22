import { flagOf } from "@/lib/countries";

/** 国旗。ふだんは端末の絵文字で、描けない端末（主に Windows）だけ Noto Color Emoji で描く（FlagSupport.tsx） */
export function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span className={`font-flag leading-none ${className}`} aria-hidden>
      {flagOf(code)}
    </span>
  );
}
