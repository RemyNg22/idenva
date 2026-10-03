use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                let sidecar_command = app.shell().sidecar("idenva-backend");
                if let Ok(command) = sidecar_command {
                    tauri::async_runtime::spawn(async move {
                        let _ = command.spawn();
                    });
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}