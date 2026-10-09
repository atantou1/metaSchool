#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(sidecar_command) = handle.shell().sidecar("backend") {
                    if let Ok((mut _rx, mut _child)) = sidecar_command.spawn() {
                        while let Some(_event) = _rx.recv().await {
                            // Backend process event loop
                        }
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running metaSchool application");
}
