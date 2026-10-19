#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        // fs plugin: powers OS-level file drops (Explorer -> app window),
        // bridged to the React tools in `src/lib/desktop.ts`.
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running ShrinkIt");
}
