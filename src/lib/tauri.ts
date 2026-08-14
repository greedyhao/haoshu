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

// 导出模式（Rust 侧 export_ai 的 mode 参数）：
// - "full"（默认）：prompt_friendly.md + 全量扁平数据（旧行为）；
// - "brief"：prompt_friendly.md + 一次性精简数据（tier1 典籍原文 + 神煞短字段）；
// - "menu"：prompt_interactive.md + 精简数据 + 典籍/神煞菜单（交互式第一轮）。
export type ExportMode = "full" | "brief" | "menu";

// 调用 Rust 侧 #[tauri::command] export_ai，返回「提示词 + 扁平原文本数据」的纯文本包，
// 可直接落地为 .txt 喂给外部大模型分析。导出始终用全量（引擎侧 lean=false）。
// 命令签名是 `fn export_ai(app, export: ExportArgs)`，ExportArgs = { args, mode }，因此传 { export: { args: {...}, mode } }。
export function export_ai(args: AnalyzeArgs, mode: ExportMode = "full"): Promise<string> {
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
      mode,
    },
  });
}

// 大模型勾选结果（对应交互式第一轮 prompt_interactive.md 的 JSON 协议）。
export interface MaterialSelection {
  corpusIds: number[];
  shensha: string[];
  /** 取回全量 60 年大运流年明细（第一轮只含关键年份） */
  yearlyAll?: boolean;
  /** 取回全量岁运引动逐年明细（第一轮只含触发年份） */
  suiyunAll?: boolean;
  reason?: string;
}

// 调用 Rust 侧 #[tauri::command] fetch_materials，返回第二轮纯文本包
// （prompt_round2.md，{{SELECTION}}/{{MATERIALS}} 已替换），与第一轮消息同对话续发。
// 空选时引擎自动降级为 tier1 典籍原文兜底。
// 命令签名是 `fn fetch_materials(app, request: MaterialArgs)`，因此传 { request: { args: {...}, corpusIds, shensha } }。
export function fetch_materials(args: AnalyzeArgs, selection: MaterialSelection): Promise<string> {
  return invoke<string>("fetch_materials", {
    request: {
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
      corpusIds: selection.corpusIds,
      shensha: selection.shensha,
      yearlyAll: selection.yearlyAll ?? false,
      suiyunAll: selection.suiyunAll ?? false,
    },
  });
}
