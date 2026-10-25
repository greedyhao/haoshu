use bazi_analyzer::ai_export::{build_ai_report, build_ai_save_bundle, AiReport};
use bazi_analyzer::bazi::Gender;
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

/// 导出给大模型分析的命令（第四轮整改后仅两种模式）：
/// - "brief"（默认）：prompt_friendly.md + **精简包**（四柱藏干/旺衰格局调候/冲合/
///   大运/当前年及未来五年/4–6 条精选典籍），单轮直发；
/// - "debug-full"：prompt_friendly.md + 全量扁平数据（**仅调试用**，体积可达数百 KB）。
///
/// 机器校验已退到引擎 CLI（`--verify-text`），与导出解耦，不再作为界面功能。
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportArgs {
    pub args: AnalyzeArgs,
    #[serde(default)]
    pub mode: Option<String>, // "brief" | "debug-full"
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
    // 导出始终用全量（lean=false），由数据段自行裁剪，保证事实完整。
    let result = analyze_bazi_detailed(&query)?;
    let ai_report = build_ai_report(&result, false);

    let mode = export.mode.as_deref().unwrap_or("brief");
    let data = match mode {
        "brief" => bazi_analyzer::brief::build_brief_pack(&ai_report).text,
        "debug-full" => bazi_analyzer::ai_export::build_ai_compact(&ai_report),
        other => {
            return Err(format!(
                "未知导出模式：{other}（可选 brief/debug-full；叙事包/软件评审包/两轮版已于第四轮整改移除）"
            ))
        }
    };
    let prompt = read_prompt(&app, "prompt_friendly.md")?;
    let data_tokens = bazi_analyzer::ai_export::estimate_tokens(&data);
    let data_chars = data.chars().count();
    Ok(ExportResult {
        bundle: build_ai_save_bundle(&prompt, &data),
        mode: mode.to_string(),
        data_chars,
        data_tokens,
    })
}
