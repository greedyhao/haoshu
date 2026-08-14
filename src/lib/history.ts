import type { AnalyzeArgs } from "./tauri";

// 历史分析记录（localStorage 持久化，上限 50 条，同参数去重）
export interface HistoryEntry {
  id: string;
  ts: number;
  args: AnalyzeArgs;
  /** 四柱 + 性别，如 "庚午 癸未 辛巳 乙未 · 男" */
  bazi: string;
  /** 出生时间标签，如 "1990-07-15 14:30" */
  dateLabel: string;
}

const KEY = "bazi.history";
const MAX = 50;

function isEntry(x: unknown): x is HistoryEntry {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  const a = e.args as Record<string, unknown> | undefined;
  return (
    typeof e.id === "string" &&
    typeof e.ts === "number" &&
    typeof e.bazi === "string" &&
    typeof e.dateLabel === "string" &&
    !!a &&
    typeof a === "object" &&
    typeof a.year === "number"
  );
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(isEntry).slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveHistory(list: HistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* 存储不可用时忽略 */
  }
}

/** 去重签名：相同输入重复分析时只保留最新一条 */
export function historyKey(args: AnalyzeArgs): string {
  return JSON.stringify({
    year: args.year,
    month: args.month,
    day: args.day,
    hour: args.hour,
    minute: args.minute ?? 0,
    gender: args.gender,
    isGregorian: args.isGregorian ?? true,
    isLeap: args.isLeap ?? false,
    skipDayun: args.skipDayun ?? false,
    baziDirect: args.baziDirect ?? "",
  });
}

/** 生成记录 id（crypto.randomUUID 兜底时间戳） */
export function genId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* 继续走兜底 */
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
