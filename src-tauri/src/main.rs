#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Spawn Python backend
            tauri::async_runtime::spawn(async move {
                if let Ok(sidecar_command) = handle.shell().sidecar("backend") {
                    if let Ok((mut _rx, _child)) = sidecar_command.spawn() {
                        while let Some(_event) = _rx.recv().await {
                            // Backend process event loop
                        }
                    }
                }
            });

            // Spawn Node Next.js frontend
            let handle2 = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(resource_dir) = handle2.path().resource_dir() {
                    let standalone_dir = resource_dir.join("resources").join("standalone").join("frontend");
                    let server_js = standalone_dir.join("server.js");
                    
                    if let Ok(app_data_dir) = handle2.path().app_data_dir() {
                        let _ = std::fs::create_dir_all(&app_data_dir);
                        let db_path = app_data_dir.join("metaschool.db");
                        let db_url = format!("file:{}", db_path.to_string_lossy());
                        
                        if let Ok(sidecar_command) = handle2.shell().sidecar("node") {
                            let cmd = sidecar_command
                                .current_dir(standalone_dir)
                                .env("DATABASE_URL", db_url)
                                .env("PORT", "3000")
                                .env("HOSTNAME", "127.0.0.1")
                                .arg(server_js.to_string_lossy().to_string());
                                
                            if let Ok((mut _rx, _child)) = cmd.spawn() {
                                while let Some(_event) = _rx.recv().await {
                                    // Node process event loop
                                }
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running metaSchool application");
}
