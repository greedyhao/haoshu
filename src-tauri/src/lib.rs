use tauri::Manager;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 让引擎读取打包的 SQLite 数据（corpus.db / shensha.db）。
            // 引擎在打开数据库前会读取 BAZI_DATA_DIR 环境变量，未设置则走原相对路径。
            if let Ok(res_dir) = app.path().resource_dir() {
                if let Some(s) = res_dir.to_str() {
                    std::env::set_var("BAZI_DATA_DIR", s);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::analyze,
            commands::export_ai,
            commands::fetch_materials
        ])
        .run(tauri::generate_context!())
        .expect("error while running bazi-ui");
}
