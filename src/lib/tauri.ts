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
// 注意：Tauri 2 要求 JS 用与 Rust 参数同名的键包裹参数，命令签名是
// `fn analyze(args: AnalyzeArgs)`，因此必须传 { args: {...} }。
export function analyze(args: AnalyzeArgs): Promise<AiReport> {
  return invoke<AiReport>("analyze", {
    args: {
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
      lean: args.lean ?? false,
    },
  });
}

// 调用 Rust 侧 #[tauri::command] export_ai，返回「固定提示词(prompt_friendly.md) + 扁平原文本数据」的纯文本包，
// 可直接落地为 .txt 喂给外部大模型分析。导出始终用全量（引擎侧 lean=false）。
// 命令签名是 `fn export_ai(app, export: ExportArgs)`，ExportArgs 仅含 args，因此传 { export: { args: {...} } }。
export function export_ai(args: AnalyzeArgs): Promise<string> {
  return invoke<string>("export_ai", {
    export: {
      args: {
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
        lean: false,
      },
    },
  });
}
