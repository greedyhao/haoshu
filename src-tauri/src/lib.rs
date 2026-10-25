use tauri::Manager;
use tauri_plugin_fs::FsExt;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // Android 文件系统插件（MediaStore 写公共目录 + 系统分享/查看面板）；
        // 桌面端为 no-op，不影响桌面行为。
        .plugin(tauri_plugin_android_fs::init())
        .setup(|app| {
            // 让引擎读取打包的 SQLite 数据（corpus.db / shensha.db）与提示词（prompts）。
            // 引擎打开数据库前会读取 BAZI_DATA_DIR 环境变量；read_prompt 读取 HAOSHU_RESOURCES_DIR。
            //
            // 核心原则（Tauri Android）：数据库是“动态数据”，不能放在只读的 assets/；
            // 只读的静态种子（bundle.resources）首次启动时须复制到应用私有可写目录
            // app_data_dir()，再让引擎从真实路径打开。
            //
            // 读取 assets/ 内的打包资源必须用 tauri-plugin-fs：Android 上 resource_dir()
            // 返回虚拟协议路径 `asset://localhost/...`，普通 std::fs 读不到；而 fs 插件的
            // read 在 Android 上会识别该前缀、经 AssetManager 打开 APK 内 assets/ 并返回真实 fd。
            // 桌面端 resource_dir() 是真实路径，同样走 fs 插件 read 即可，行为一致。
            ensure_bundled_resources(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::analyze,
            commands::export_ai,
            commands::fetch_materials,
            commands::verify_and_render_claims,
            commands::verify_narrative,
            commands::preview_context
        ])
        .run(tauri::generate_context!())
        .expect("error while running haoshu");
}

/// 把打包的静态资源（corpus.db / shensha.db / prompts）从资源目录
/// 复制到应用私有可写目录 app_data_dir()，并把 BAZI_DATA_DIR / HAOSHU_RESOURCES_DIR
/// 指向该目录。一次只拷贝缺失的文件（首启后幂等）。
///
/// 用 tauri-plugin-fs 的 read 读取源：Android 上 resource_dir() 是 `asset://localhost/...`
/// 虚拟路径，fs 插件会经 AssetManager 打开 APK 内 assets/；桌面端为真实路径，直接读取。
fn ensure_bundled_resources<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 app_data_dir: {}", e))?;
    std::fs::create_dir_all(&data_dir).map_err(|e| format!("创建数据目录失败: {}", e))?;

    let res_root = app.path().resource_dir().unwrap_or_default();

    // (源相对路径候选, 目标相对路径)；目标相对于 data_dir。
    // 源候选兼容两种打包布局：resources/ 子目录 或 根目录。
    let items: &[(&[&str], &str)] = &[
        (
            &["resources/corpus.db", "corpus.db"],
            "corpus.db",
        ),
        (
            &["resources/shensha.db", "shensha.db"],
            "shensha.db",
        ),
        (
            &["resources/prompts/prompt_friendly.md", "prompts/prompt_friendly.md"],
            "resources/prompts/prompt_friendly.md",
        ),
        (
            &["resources/prompts/prompt_interactive.md", "prompts/prompt_interactive.md"],
            "resources/prompts/prompt_interactive.md",
        ),
        (
            &["resources/prompts/prompt_round2.md", "prompts/prompt_round2.md"],
            "resources/prompts/prompt_round2.md",
        ),
        (
            &["resources/prompts/prompt_narrative.md", "prompts/prompt_narrative.md"],
            "resources/prompts/prompt_narrative.md",
        ),
        (
            &["resources/prompts/prompt_review.md", "prompts/prompt_review.md"],
            "resources/prompts/prompt_review.md",
        ),
    ];

    for (src_candidates, dst_rel) in items {
        let dest = data_dir.join(dst_rel);
        if dest.exists() {
            continue; // 已拷贝，幂等
        }
        if let Some(parent) = dest.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let mut copied = false;
        for src_rel in *src_candidates {
            let src = res_root.join(src_rel);
            match app.fs().read(&src) {
                Ok(bytes) => match std::fs::write(&dest, &bytes) {
                    Ok(()) => {
                        eprintln!("[haoshu] 已从资源拷贝 {} -> {}", src.display(), dest.display());
                        copied = true;
                        break;
                    }
                    Err(e) => eprintln!("[haoshu] 警告：写入 {} 失败: {}", dest.display(), e),
                },
                Err(_) => continue, // 尝试下一个候选
            }
        }
        if !copied {
            eprintln!(
                "[haoshu] 警告：资源未找到（已尝试 {:?} 于 {:?}）",
                src_candidates, res_root
            );
        }
    }

    // 引擎与 read_prompt 都从应用私有可写目录读取。
    if let Some(s) = data_dir.to_str() {
        std::env::set_var("BAZI_DATA_DIR", s);
        std::env::set_var("HAOSHU_RESOURCES_DIR", s);
        eprintln!("[haoshu] BAZI_DATA_DIR = {}", s);
    }
    Ok(())
}
