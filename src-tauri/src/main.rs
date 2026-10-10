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
                        
                        let db_url = if cfg!(windows) {
                            format!("file:///{}", db_path.to_string_lossy().replace('\\', "/"))
                        } else {
                            format!("file:{}", db_path.to_string_lossy())
                        };
                        
                        if let Ok(sidecar_command) = handle2.shell().sidecar("node") {
                            let cmd = sidecar_command
                                .current_dir(standalone_dir)
                                .env("DATABASE_URL", db_url.clone())
                                .env("PORT", "3000")
                                .env("HOSTNAME", "127.0.0.1")
                                .arg(server_js.to_string_lossy().to_string());
                                
                            if let Ok((mut _rx, _child)) = cmd.spawn() {
                                tauri::async_runtime::spawn(async move {
                                    use tauri_plugin_shell::process::CommandEvent;
                                    use std::io::Write;
                                    let log_path = app_data_dir.join("node_debug.log");
                                    if let Ok(mut file) = std::fs::File::create(&log_path) {
                                        let _ = writeln!(file, "Starting Node.js with DATABASE_URL: {}", db_url);
                                        while let Some(event) = _rx.recv().await {
                                            match event {
                                                CommandEvent::Stdout(line) => { let _ = writeln!(file, "OUT: {}", String::from_utf8_lossy(&line)); }
                                                CommandEvent::Stderr(line) => { let _ = writeln!(file, "ERR: {}", String::from_utf8_lossy(&line)); }
                                                _ => {}
                                            }
                                        }
                                    }
                                });
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
