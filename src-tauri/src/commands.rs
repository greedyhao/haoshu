use bazi_analyzer::ai_export::{
    build_ai_brief, build_ai_compact, build_ai_lite, build_ai_report, build_ai_save_bundle, AiReport,
};
use bazi_analyzer::bazi::Gender;
use bazi_analyzer::claims::{
    parse_claims_json, render_claims_markdown, validate_claims, ClaimsDoc, ValidationReport,
};
use bazi_analyzer::context::{build_analysis_context, ContextBudget};
use bazi_analyzer::narrative::{
    render_narrative_final, split_certification, verify_narrative as verify_narrative_text,
    NarrativeCheck,
};
use bazi_analyzer::selection::{
    parse_selection_json, select_materials, selection_summary, MaterialSelection, SelectionError,
};
use bazi_analyzer::service::{analyze_bazi_detailed, AnalysisQuery};
use serde::Serialize;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// 前端传来的分析参数（camelCase，与 JS 自动对应）。
/// 只暴露简单字段，内部再映射成引擎的 `AnalysisQuery`，
/// 这样前端契约与引擎结构解耦，引擎字段变动不影响前端。
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeArgs {
    pub year: i32,
    pub month: u32,
    pub day: u32,
    pub hour: u32,
    pub minute: u32,
    #[serde(default)]
    pub gender: String, // "male" | "female"
    #[serde(default)]
    pub is_gregorian: bool,
    #[serde(default)]
    pub is_leap: bool,
    #[serde(default)]
    pub skip_dayun: bool,
    #[serde(default)]
    pub bazi_direct: Option<String>,
    #[serde(default)]
    pub liu_yue_year: Option<i32>,
    #[serde(default)]
    pub lean: bool,
    /// 分析基准时刻（YYYY-MM-DD 或 ISO8601）。缺省取当前时刻。
    #[serde(default)]
    pub as_of: Option<String>,
}

/// 把前端参数映射为引擎 `AnalysisQuery`（analyze 与 export 共用，避免重复）。
fn build_query(args: &AnalyzeArgs) -> Result<AnalysisQuery, String> {
    let gender = if args.gender == "female" {
        Gender::Female
    } else {
        Gender::Male
    };

    let bazi_direct = match &args.bazi_direct {
        Some(s) if !s.trim().is_empty() => {
            let parts: Vec<String> = s.split_whitespace().map(|x| x.to_string()).collect();
            if parts.len() != 4 {
                return Err("八字直录需四柱，如 \"庚午 癸未 辛巳 乙未\"".into());
            }
            Some([parts[0].clone(), parts[1].clone(), parts[2].clone(), parts[3].clone()])
        }
        _ => None,
    };

    Ok(AnalysisQuery {
        year: args.year,
        month: args.month,
        day: args.day,
        hour: args.hour,
        minute: args.minute,
        gender,
        is_gregorian: args.is_gregorian,
        is_leap: args.is_leap,
        skip_dayun: args.skip_dayun,
        bazi_direct,
        qi_yun_year: None,
        liu_yue_year: args.liu_yue_year,
        as_of: args.as_of.clone(),
        inferred_birth: None,
    })
}

/// 核心分析命令：前端 invoke('analyze', args) → 返回完整 AiReport JSON（GUI 渲染用）。
/// 同进程直接调用引擎，无子进程冷启动、无 HTTP server。
#[tauri::command]
pub fn analyze(args: AnalyzeArgs) -> Result<AiReport, String> {
    let query = build_query(&args)?;
    let result = analyze_bazi_detailed(&query)?;
    Ok(build_ai_report(&result, args.lean))
}

/// 读取 resources/prompts/ 下的提示词模板。
/// 优先从已拷贝到应用私有可写目录的资源读（Android 上 resource_dir 是
/// `asset://localhost/` 虚拟路径，std::fs 读不到）；桌面端兜底走 resource_dir。
fn read_prompt(app: &AppHandle, name: &str) -> Result<String, String> {
    if let Ok(d) = std::env::var("HAOSHU_RESOURCES_DIR") {
        let p = PathBuf::from(&d)
            .join("resources")
            .join("prompts")
            .join(name);
        if let Ok(s) = std::fs::read_to_string(&p) {
            return Ok(s);
        }
    }
    let res_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("无法获取资源目录: {}", e))?;
    let prompt_path = res_dir.join("resources").join("prompts").join(name);
    std::fs::read_to_string(&prompt_path)
        .map_err(|e| format!("读取提示词模板失败 {}: {}", prompt_path.display(), e))
}

/// 导出给大模型分析的命令（评审 P1-3 整改后的模式）：
/// - "context"（默认）：prompt_interactive.md + **AnalysisContext**（核心事实/引擎论断/
///   争议项/未知项 + 证据目录 + 取材协议）。已做注意力优化与 token 预算，
///   是全量包体积的 ~4%，作为喂模型的正路；
/// - "narrative"：prompt_narrative.md + **叙事包**（第三轮整改：精简事实 + 默认时间窗 +
///   自动选证 4–6 条）。单轮生成第二人称报告，配 `verify_narrative` 做后台校验；
/// - "review"：prompt_review.md + 同一份叙事包（软件评审与命理解读共用已校验事实，
///   各自成文，互不混写）；
/// - "brief"：prompt_friendly.md + 一次性精简数据（单轮省 token）；
/// - "debug-full"：prompt_friendly.md + 全量扁平数据（**仅调试用**，体积可达数百 KB）。
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportArgs {
    pub args: AnalyzeArgs,
    #[serde(default)]
    pub mode: Option<String>, // "context" | "brief" | "debug-full"
}

/// 导出结果（含体积与 token 估算，便于前端提示"是不是该用全量包"）
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    /// 完整提示词包（提示词 + 数据段）
    pub bundle: String,
    /// 实际使用的模式
    pub mode: String,
    /// 数据段字符数
    pub data_chars: usize,
    /// 数据段 token 估算
    pub data_tokens: usize,
}

#[tauri::command]
pub fn export_ai(app: AppHandle, export: ExportArgs) -> Result<ExportResult, String> {
    let query = build_query(&export.args)?;
    // 导出始终用全量（lean=false），保证喂给大模型的流年/神煞/典籍等数据完整。
    let result = analyze_bazi_detailed(&query)?;
    let ai_report = build_ai_report(&result, false);

    let mode = export.mode.as_deref().unwrap_or("context");
    let (prompt_name, data) = match mode {
        "brief" => ("prompt_friendly.md", build_ai_brief(&ai_report)),
        "debug-full" => ("prompt_friendly.md", build_ai_compact(&ai_report)),
        // 叙事包：命理解读与软件评审共用同一份已校验事实，分别配不同提示词
        "narrative" => (
            "prompt_narrative.md",
            bazi_analyzer::narrative::build_narrative_pack(&ai_report).text,
        ),
        "review" => (
            "prompt_review.md",
            bazi_analyzer::narrative::build_narrative_pack(&ai_report).text,
        ),
        "menu" | "context" => {
            // 兼容旧的前端 "menu" 命名
            let ctx = build_analysis_context(&result, &ai_report, ContextBudget::default());
            let text = format!("{}{}", ctx.render(), ctx.selection_protocol());
            ("prompt_interactive.md", text)
        }
        other => return Err(format!("未知导出模式：{other}")),
    };
    let prompt = read_prompt(&app, prompt_name)?;
    let data_tokens = bazi_analyzer::context::estimate_tokens(&data);
    let data_chars = data.chars().count();
    Ok(ExportResult {
        bundle: build_ai_save_bundle(&prompt, &data),
        mode: mode.to_string(),
        data_chars,
        data_tokens,
    })
}

/// 交互式第二轮：按大模型勾选结果取回原文材料。
///
/// **严格协议**（评审 P1-4）：`selection` 是模型回复原文，由引擎侧严格解析与校验；
/// 未知 ID / 越界序号 / 未知神煞 / 超上限 / 解析失败一律返回
/// `Err(JSON 序列化的错误数组)`，**不做任何兜底替换**。
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialArgs {
    pub args: AnalyzeArgs,
    /// 模型输出的取材 JSON 原文（不是已解析的对象）
    pub selection: String,
}

/// 取材结果
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialResult {
    /// 第二轮完整提示词包
    pub bundle: String,
    /// 取材摘要（实际命中了什么）
    pub summary: String,
    /// 命中的 corpus_id
    pub resolved_corpus_ids: Vec<i64>,
    /// 命中的菜单序号
    pub resolved_menu_indexes: Vec<usize>,
    /// 命中的神煞
    pub resolved_shensha: Vec<String>,
    /// 非致命提示
    pub warnings: Vec<String>,
    /// 材料字符数
    pub material_chars: usize,
}

#[tauri::command]
pub fn fetch_materials(app: AppHandle, request: MaterialArgs) -> Result<MaterialResult, String> {
    let selection: MaterialSelection = parse_selection_json(&request.selection)
        .map_err(|errs| serde_json::to_string(&errs).unwrap_or_else(|_| "取材请求不合法".into()))?;

    let query = build_query(&request.args)?;
    let result = analyze_bazi_detailed(&query)?;
    let ai_report = build_ai_report(&result, false);

    let bundle = select_materials(&ai_report, &selection)
        .map_err(|errs| serde_json::to_string(&errs).unwrap_or_else(|_| "取材失败".into()))?;

    let template = read_prompt(&app, "prompt_round2.md")?;
    let summary = selection_summary(&selection, &bundle);
    let composed = template
        .replace("{{SELECTION}}", &summary)
        .replace("{{MATERIALS}}", &bundle.text);

    Ok(MaterialResult {
        bundle: composed,
        summary,
        material_chars: bundle.text.chars().count(),
        resolved_corpus_ids: bundle.resolved_corpus_ids,
        resolved_menu_indexes: bundle.resolved_menu_indexes,
        resolved_shensha: bundle.resolved_shensha,
        warnings: bundle.warnings,
    })
}

/// 校验并渲染第三轮 claims。
///
/// 模型必须输出 `{"claims":[{claim_type,text,fact_ids,rule_id,corpus_ids,quotes,section}]}`；
/// 引擎校验四柱 / 流年干支 / 当前大运 / 证据 ID / 引文是否真出自该典籍，
/// 只渲染通过校验的条目，被拒条目进附录。
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaimsArgs {
    pub args: AnalyzeArgs,
    /// 模型输出的 claims JSON 原文
    pub raw: String,
}

/// 校验渲染结果
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaimsResult {
    /// 本地渲染的 Markdown（只含通过校验的结论）
    pub markdown: String,
    /// 校验报告
    pub validation: ValidationReport,
    /// 解析后的结构（便于前端调试展示）
    pub claims: ClaimsDoc,
}

#[tauri::command]
pub fn verify_and_render_claims(
    request: ClaimsArgs,
) -> Result<ClaimsResult, Vec<SelectionError>> {
    let doc = parse_claims_json(&request.raw).map_err(|errs| {
        errs.into_iter()
            .map(|e| SelectionError {
                code: e.code,
                field: "claims".into(),
                value: e.claim_index.to_string(),
                message: e.message,
            })
            .collect::<Vec<_>>()
    })?;

    let query = build_query(&request.args).map_err(|e| {
        vec![SelectionError {
            code: "BAD_ARGS".into(),
            field: "args".into(),
            value: String::new(),
            message: e,
        }]
    })?;
    let result = analyze_bazi_detailed(&query).map_err(|e| {
        vec![SelectionError {
            code: "ANALYZE_FAILED".into(),
            field: "args".into(),
            value: String::new(),
            message: e,
        }]
    })?;
    let ai_report = build_ai_report(&result, false);
    let ctx = build_analysis_context(&result, &ai_report, ContextBudget::default());
    let validation = validate_claims(&doc, &ai_report, &ctx);
    let markdown = render_claims_markdown(&doc, &validation);
    Ok(ClaimsResult {
        markdown,
        validation,
        claims: doc,
    })
}

/// 校验叙事版回复（第三轮整改：严格校验藏在后台）。
///
/// 输入是模型的完整回复（叙事正文 + 文末 ```verification 引文清单）。
/// 引擎继续核对四柱、流年干支、当前大运、旺衰口径与引文，但校验结果
/// **只进文末附录**，不改正文、不作为渲染正文的来源。
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NarrativeArgs {
    pub args: AnalyzeArgs,
    /// 模型回复原文（正文 + verification 代码块）
    pub raw: String,
}

/// 叙事校验结果
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NarrativeVerifyResult {
    /// 最终文档：正文原样 + 附录（校验结果/引文出处/rule_id）
    pub markdown: String,
    /// 后台校验报告（前端横幅提示用）
    pub check: NarrativeCheck,
}

#[tauri::command]
pub fn verify_narrative(request: NarrativeArgs) -> Result<NarrativeVerifyResult, String> {
    let query = build_query(&request.args)?;
    let result = analyze_bazi_detailed(&query)?;
    let ai_report = build_ai_report(&result, false);

    let (body, cert) = split_certification(&request.raw);
    let check = verify_narrative_text(&body, cert.as_ref(), &ai_report);
    let markdown = render_narrative_final(&body, &check, &ai_report);
    Ok(NarrativeVerifyResult { markdown, check })
}

/// 只读暴露：查看本轮 AnalysisContext 的渲染文本（调试/教学用，不影响导出）
#[tauri::command]
pub fn preview_context(args: AnalyzeArgs) -> Result<String, String> {
    let query = build_query(&args)?;
    let result = analyze_bazi_detailed(&query)?;
    let ai_report = build_ai_report(&result, false);
    let ctx = build_analysis_context(&result, &ai_report, ContextBudget::default());
    Ok(format!("{}{}", ctx.render(), ctx.selection_protocol()))
}

/// 兼容：保留 _lite 引用以免 dead_code 警告（旧菜单包在 debug 时仍可选）
#[allow(dead_code)]
fn _legacy_menu(report: &AiReport) -> String {
    build_ai_lite(report)
}
