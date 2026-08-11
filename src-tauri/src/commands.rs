use bazi_analyzer::ai_export::{build_ai_report, AiReport};
use bazi_analyzer::bazi::Gender;
use bazi_analyzer::service::{AnalysisQuery, analyze_bazi_detailed};

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

/// 核心分析命令：前端 invoke('analyze', args) → 返回完整 AiReport JSON。
/// 同进程直接调用引擎，无子进程冷启动、无 HTTP server。
#[tauri::command]
pub fn analyze(args: AnalyzeArgs) -> Result<AiReport, String> {
    let gender = if args.gender == "female" {
        Gender::Female
    } else {
        Gender::Male
    };

    let bazi_direct = match args.bazi_direct {
        Some(s) if !s.trim().is_empty() => {
            let parts: Vec<String> = s.split_whitespace().map(|x| x.to_string()).collect();
            if parts.len() != 4 {
                return Err("八字直录需四柱，如 \"庚午 癸未 辛巳 乙未\"".into());
            }
            Some([
                parts[0].clone(),
                parts[1].clone(),
                parts[2].clone(),
                parts[3].clone(),
            ])
        }
        _ => None,
    };

    let query = AnalysisQuery {
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
    };

    let result = analyze_bazi_detailed(&query)?;
    Ok(build_ai_report(&result, args.lean))
}
