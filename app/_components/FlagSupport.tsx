"use client";

import { useEffect } from "react";

const KEY = "kyounosuki:flag-fallback";

/**
 * この端末が国旗の絵文字を描けるか調べて、描けなければ <html class="flag-fallback"> を付ける。
 * そのときだけ globals.css が国旗に Noto Color Emoji（708KB）を使う。
 * iPhone・Android・Mac は自前で描けるので、重いフォントを読まずにすむ（描けないのは主に Windows）。
 * 何も描画しない。layout.tsx に1つだけ置く。
 */
export function FlagSupport() {
  useEffect(() => {
    let fallback: boolean;
    try {
      const saved = sessionStorage.getItem(KEY);
      fallback = saved === null ? !canDrawFlag() : saved === "1";
      sessionStorage.setItem(KEY, fallback ? "1" : "0");
    } catch {
      fallback = !canDrawFlag();
    }
    document.documentElement.classList.toggle("flag-fallback", fallback);
  }, []);
  return null;
}

/** 🇯🇵 を canvas に描いて、色が付いているか（＝国旗の絵になったか）を見る。文字（JP）なら白黒になる */
function canDrawFlag(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return true;
    ctx.font = `24px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText("\u{1F1EF}\u{1F1F5}", 0, 4);
    const px = ctx.getImageData(0, 0, 32, 32).data;
    for (let i = 0; i < px.length; i += 4) {
      const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
      if (a > 0 && (Math.abs(r - g) > 30 || Math.abs(g - b) > 30)) return true; // 日の丸の赤がある
    }
    return false;
  } catch {
    return true; // 調べられないときは、重いフォントを読まない側に倒す
  }
}
