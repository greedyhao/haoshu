import { invoke } from "@tauri-apps/api/core";
import type { AiReport } from "../types/aiReport";

export interface AnalyzeArgs {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender: "male" | "female";
  isGregorian?: boolean;
  isLeap?: boolean;
  skipDayun?: boolean;
  baziDirect?: string;
  liuYueYear?: number | null;
  lean?: boolean;
}

// 调用 Rust 侧 #[tauri::command] analyze，返回完整 AiReport。
export function analyze(args: AnalyzeArgs): Promise<AiReport> {
  return invoke<AiReport>("analyze", {
    year: args.year,
    month: args.month,
    day: args.day,
    hour: args.hour,
    minute: args.minute ?? 0,
    gender: args.gender,
    isGregorian: args.isGregorian ?? true,
    isLeap: args.isLeap ?? false,
    skipDayun: args.skipDayun ?? false,
    baziDirect: args.baziDirect ?? null,
    liuYueYear: args.liuYueYear ?? null,
    lean: args.lean ?? true,
  });
}
