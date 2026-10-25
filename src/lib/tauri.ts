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
  /** 分析基准时刻（YYYY-MM-DD 或 ISO8601）。缺省取当前时刻。 */
  asOf?: string | null;
}

/** 把前端参数映射为 Rust 侧 AnalyzeArgs 的 snake→camel 结构 */
function argsPayload(args: AnalyzeArgs) {
  return {
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
    asOf: args.asOf ?? null,
  };
}

// 调用 Rust 侧 #[tauri::command] analyze，返回完整 AiReport。
// 注意：Tauri 2 要求 JS 用与 Rust 参数同名的键包裹参数，命令签名是
// `fn analyze(args: AnalyzeArgs)`，因此必须传 { args: {...} }。
export function analyze(args: AnalyzeArgs): Promise<AiReport> {
  return invoke<AiReport>("analyze", { args: argsPayload(args) });
}

// 导出模式（第四轮整改后仅两种）：
// - "brief"（默认）：prompt_friendly.md + 精简包（四柱藏干/旺衰格局调候/冲合/
//   大运/当前年及未来五年/4–6 条精选典籍），单轮直发；
// - "debug-full"：全量扁平数据（仅调试，可达数百 KB）。
// 叙事包/软件评审包/两轮版已移除；机器校验退到引擎 CLI（--verify-text），
// 不再作为界面功能。
export type ExportMode = "brief" | "debug-full";

export interface ExportResult {
  bundle: string;
  mode: string;
  dataChars: number;
  dataTokens: number;
}

// 调用 Rust 侧 #[tauri::command] export_ai，返回「提示词 + 数据段」的纯文本包，
// 可直接落地为 .txt 喂给外部大模型分析。导出始终用全量（引擎侧 lean=false）。
export function export_ai(
  args: AnalyzeArgs,
  mode: ExportMode = "brief"
): Promise<ExportResult> {
  return invoke<ExportResult>("export_ai", {
    export: { args: argsPayload({ ...args, lean: false }), mode },
  });
}
