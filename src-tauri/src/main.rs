#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        // fs plugin: powers OS-level file drops (Explorer -> app window),
        // bridged to the React tools in `src/lib/desktop.ts`.
        .plugin(tauri_plugin_fs::init())
        // dialog plugin: native Save dialogs for downloads.
        .plugin(tauri_plugin_dialog::init())
        // clipboard-manager plugin: reliable image copy in the WebView.
        .plugin(tauri_plugin_clipboard_manager::init())
        // opener plugin: external links (privacy / terms / website) open
        // in the user's default browser, like the Android app.
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running ShrinkIt");
}
