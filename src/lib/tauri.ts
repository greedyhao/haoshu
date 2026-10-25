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

// 导出模式（Rust 侧 export_ai 的 mode 参数）：
// - "context"（默认）：prompt_interactive.md + AnalysisContext（核心事实/引擎论断/
//   争议项/未知项 + 证据目录 + 严格取材协议）。已做注意力优化与 token 预算，
//   是全量包体积的 ~4%，作为喂模型的正路；
// - "narrative"：prompt_narrative.md + 叙事包（第三轮整改：精简事实 + 默认时间窗 +
//   自动选证 4–6 条）。单轮生成第二人称报告，回复走 verifyNarrative 后台校验；
// - "review"：prompt_review.md + 同一份叙事包（软件评审独立成文，与命理解读
//   共用已校验事实、不共用文章）；
// - "brief"：prompt_friendly.md + 一次性精简数据（单轮省 token）；
// - "debug-full"：prompt_friendly.md + 全量扁平数据（**仅调试**，可达数百 KB）。
export type ExportMode = "context" | "narrative" | "review" | "brief" | "debug-full";

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
  mode: ExportMode = "context"
): Promise<ExportResult> {
  return invoke<ExportResult>("export_ai", {
    export: { args: argsPayload({ ...args, lean: false }), mode },
  });
}

/** 只读预览本轮 AnalysisContext（调试用） */
export function preview_context(args: AnalyzeArgs): Promise<string> {
  return invoke<string>("preview_context", { args: argsPayload(args) });
}

// ===================== 严格取材（P1-4） =====================

/** Rust 侧 selection::SelectionError */
export interface SelectionError {
  code: string;
  field: string;
  value: string;
  message: string;
}

export interface MaterialResult {
  bundle: string;
  summary: string;
  resolvedCorpusIds: number[];
  resolvedMenuIndexes: number[];
  resolvedShensha: string[];
  warnings: string[];
  materialChars: number;
}

/**
 * 调用 fetch_materials 取回第二轮材料。
 *
 * `selection` 是**模型回复的原文**，由 Rust 侧严格解析与校验；
 * 未知 ID / 越界序号 / 未知神煞 / 超上限 / 解析失败都会 reject，
 * reject 的 reason 是 JSON 序列化的 SelectionError[]。
 */
export function fetch_materials(
  args: AnalyzeArgs,
  selection: string
): Promise<MaterialResult> {
  return invoke<MaterialResult>("fetch_materials", {
    request: { args: argsPayload({ ...args, lean: false }), selection },
  });
}

/** 把 reject reason 解析成 SelectionError[]（非 JSON 时返回空数组） */
export function parseSelectionErrors(reason: unknown): SelectionError[] {
  if (typeof reason === "string") {
    try {
      const v = JSON.parse(reason);
      if (Array.isArray(v)) return v as SelectionError[];
    } catch {
      /* 非 JSON，落到下面 */
    }
  }
  return [];
}

// ===================== claims 校验与渲染（P1-5） =====================

export interface ClaimIssue {
  level: "error" | "warning";
  code: string;
  claim_index: number;
  message: string;
}

export interface ClaimVerdict {
  claim_index: number;
  ok: boolean;
  codes: string[];
  notes: string[];
}

export interface ValidationReport {
  total: number;
  accepted: number;
  rejected: number;
  errors: ClaimIssue[];
  warnings: ClaimIssue[];
  verdicts: ClaimVerdict[];
}

export interface ClaimsResult {
  /** 本地渲染的 Markdown（只含通过校验的结论） */
  markdown: string;
  validation: ValidationReport;
  claims: {
    summary?: string | null;
    claims: unknown[];
  };
}

/**
 * 校验并渲染第三轮 claims。
 *
 * `raw` 是模型输出的 claims JSON 原文；引擎会校验四柱 / 流年干支 / 当前大运 /
 * 证据 ID / 引文是否真出自该典籍，只渲染通过校验的条目。
 */
export function verify_claims(args: AnalyzeArgs, raw: string): Promise<ClaimsResult> {
  return invoke<ClaimsResult>("verify_and_render_claims", {
    request: { args: argsPayload({ ...args, lean: false }), raw },
  });
}

// ===================== 叙事版（第三轮整改：校验藏在后台） =====================

/** Rust 侧 narrative::NarrativeIssue */
export interface NarrativeIssue {
  level: "error" | "warning";
  code: string;
  message: string;
}

/** Rust 侧 narrative::NarrativeCheck */
export interface NarrativeCheck {
  pillarsOk: boolean;
  liunianChecked: number;
  liunianOk: boolean;
  dayunOk: boolean | null;
  verdictOk: boolean;
  quotesTotal: number;
  quotesOk: number;
  issues: NarrativeIssue[];
  fatal: boolean;
  summaryLine?: string;
}

export interface NarrativeVerifyResult {
  /** 正文原样 + 附录（校验结果/引文出处/rule_id） */
  markdown: string;
  check: NarrativeCheck;
}

/**
 * 校验叙事版回复（正文 + 文末 ```verification 引文清单）。
 *
 * 引擎后台核对四柱 / 流年干支 / 当前大运 / 旺衰口径 / 引文，
 * 结果只进文末附录，不改写正文。
 */
export function verifyNarrative(
  args: AnalyzeArgs,
  raw: string
): Promise<NarrativeVerifyResult> {
  return invoke<NarrativeVerifyResult>("verify_narrative", {
    request: { args: argsPayload({ ...args, lean: false }), raw },
  });
}
