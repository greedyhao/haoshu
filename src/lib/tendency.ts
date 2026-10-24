// 吉凶二元 → 概率性倾向词（评审整改 §1.11）：
// 偏顺 / 中性 / 需协调 / 需谨慎。前端只做展示层归一，不对旧文案做二次断言。

export type Tendency = "偏顺" | "中性" | "需协调" | "需谨慎";

const TENDENCY_WORDS: Tendency[] = ["偏顺", "中性", "需协调", "需谨慎"];

/** 把引擎字段（新倾向词或历史吉/凶文案）归一为四档倾向。 */
export function tendencyOf(text: string | null | undefined): Tendency {
  if (!text) return "中性";
  for (const t of TENDENCY_WORDS) {
    if (text.includes(t)) return t;
  }
  if (text.includes("吉")) return "偏顺";
  if (text.includes("凶")) return "需谨慎";
  return "中性";
}

/** 展示用文案：新倾向词原样保留；旧吉/凶二元映射为倾向词并标注概率性。 */
export function tendencyText(raw: string | null | undefined): string {
  if (!raw) return "中性（概率性）";
  for (const t of TENDENCY_WORDS) {
    if (raw.includes(t)) return raw;
  }
  const m = raw.match(/[（(]([^）)]*)[）)]/);
  const detail = m ? m[1] : "";
  const tendency: Tendency = raw.includes("吉") ? "偏顺" : raw.includes("凶") ? "需谨慎" : "中性";
  return detail ? `${tendency}（概率性，${detail}）` : `${tendency}（概率性）`;
}

/** 倾向对应的样式类（不使用正红/正绿）。 */
export function tendencyClass(t: Tendency): string {
  switch (t) {
    case "偏顺":
      return "tend-smooth";
    case "需协调":
      return "tend-coord";
    case "需谨慎":
      return "tend-caution";
    case "中性":
    default:
      return "tend-neutral";
  }
}
