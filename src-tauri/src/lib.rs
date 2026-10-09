use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Spawn Python backend sidecar (FastAPI + OR-Tools solver)
            if let Ok(sidecar_command) = app.shell().sidecar("backend") {
                tauri::async_runtime::spawn(async move {
                    if let Ok((mut _rx, mut _child)) = sidecar_command.spawn() {
                        while let Some(_event) = _rx.recv().await {
                            // Backend process output stream
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running metaSchool application");
}
