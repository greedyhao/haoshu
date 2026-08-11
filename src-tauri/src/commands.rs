use bazi_analyzer::ai_export::{build_ai_compact, build_ai_report, build_ai_save_bundle, AiReport};
use bazi_analyzer::bazi::Gender;
use bazi_analyzer::service::{AnalysisQuery, analyze_bazi_detailed};
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

/// 导出给大模型分析的命令。
///
/// 把引擎结果用 `build_ai_compact` 扁平成纯文本（schema 演进自动跟随、内容零丢失），
/// 再与打包的提示词模板（prompt_friendly.md / prompt_optimized.md）组装成一份纯文本包，
/// 直接落地给外部大模型分析。模板路径取 `resources/prompts/prompt_{name}.md`，
/// 与 corpus.db 等走同一 resource_dir 探测逻辑（dev 与打包后均可读）。
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportArgs {
    pub args: AnalyzeArgs,
    /// 提示词模板名：friendly（口语叙事版）| optimized（严谨七章版）
    pub prompt_name: String,
}

#[tauri::command]
pub fn export_ai(app: AppHandle, export: ExportArgs) -> Result<String, String> {
    if export.prompt_name != "friendly" && export.prompt_name != "optimized" {
        return Err("prompt_name 仅支持 friendly 或 optimized".into());
    }

    let query = build_query(&export.args)?;
    // 导出始终用全量（lean=false），保证喂给大模型的流年/神煞/典籍等数据完整。
    let result = analyze_bazi_detailed(&query)?;
    let ai_report = build_ai_report(&result, false);

    let res_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("无法获取资源目录: {}", e))?;
    let prompt_path = res_dir
        .join("resources")
        .join("prompts")
        .join(format!("prompt_{}.md", export.prompt_name));

    let prompt = std::fs::read_to_string(&prompt_path)
        .map_err(|e| format!("读取提示词模板失败 {}: {}", prompt_path.display(), e))?;

    let compact = build_ai_compact(&ai_report);
    Ok(build_ai_save_bundle(&prompt, &compact))
}
