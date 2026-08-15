use bazi_analyzer::ai_export::{
    build_ai_brief, build_ai_compact, build_ai_lite, build_ai_report, build_ai_save_bundle,
    extract_materials, AiReport,
};
use bazi_analyzer::bazi::Gender;
use bazi_analyzer::service::{AnalysisQuery, analyze_bazi_detailed};
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
        inferred_birth: None,
    })
}

/// 核心分析命令：前端 invoke('analyze', args) → 返回完整 AiReport JSON。
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

/// 导出给大模型分析的命令（三种模式）：
/// - "full"（默认）：prompt_friendly.md + 全量扁平数据（现状行为）；
/// - "brief"：prompt_friendly.md + 一次性精简数据（tier1 典籍原文 + 神煞短字段）；
/// - "menu"：prompt_interactive.md + 精简数据 + 典籍/神煞菜单（交互式第一轮，供大模型勾选）。
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportArgs {
    pub args: AnalyzeArgs,
    #[serde(default)]
    pub mode: Option<String>, // "full" | "brief" | "menu"
}

#[tauri::command]
pub fn export_ai(app: AppHandle, export: ExportArgs) -> Result<String, String> {
    let query = build_query(&export.args)?;
    // 导出始终用全量（lean=false），保证喂给大模型的流年/神煞/典籍等数据完整。
    let result = analyze_bazi_detailed(&query)?;
    let ai_report = build_ai_report(&result, false);

    let mode = export.mode.as_deref().unwrap_or("full");
    let (prompt_name, data) = match mode {
        "menu" => ("prompt_interactive.md", build_ai_lite(&ai_report)),
        "brief" => ("prompt_friendly.md", build_ai_brief(&ai_report)),
        _ => ("prompt_friendly.md", build_ai_compact(&ai_report)),
    };
    let prompt = read_prompt(&app, prompt_name)?;
    Ok(build_ai_save_bundle(&prompt, &data))
}

/// 交互式第二轮：按大模型勾选结果取回原文材料，注入第二轮模板。
/// 返回「prompt_round2.md（{{SELECTION}}/{{MATERIALS}} 已替换）」的纯文本包，
/// 与第一轮消息同对话续发即可。
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialArgs {
    pub args: AnalyzeArgs,
    #[serde(default)]
    pub corpus_ids: Vec<i64>,
    #[serde(default)]
    pub shensha: Vec<String>,
    /// 取回全量 60 年大运流年明细（第一轮只含关键年份）
    #[serde(default)]
    pub yearly_all: bool,
    /// 取回全量岁运引动逐年明细（第一轮只含触发年份）
    #[serde(default)]
    pub suiyun_all: bool,
}

#[tauri::command]
pub fn fetch_materials(app: AppHandle, request: MaterialArgs) -> Result<String, String> {
    let query = build_query(&request.args)?;
    let result = analyze_bazi_detailed(&query)?;
    let ai_report = build_ai_report(&result, false);
    // 空选自动降级为 tier1 典籍原文（引擎侧兜底）。
    let materials = extract_materials(
        &ai_report,
        &request.corpus_ids,
        &request.shensha,
        request.yearly_all,
        request.suiyun_all,
    );

    let template = read_prompt(&app, "prompt_round2.md")?;
    let selection = format!(
        "corpus_ids={:?} | shensha={:?} | yearly_all={} | suiyun_all={}",
        request.corpus_ids, request.shensha, request.yearly_all, request.suiyun_all
    );
    Ok(template
        .replace("{{SELECTION}}", &selection)
        .replace("{{MATERIALS}}", &materials))
}
