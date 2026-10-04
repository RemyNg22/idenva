use tauri::Manager;
use std::process::Command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                if let Ok(resource_dir) = app.path().resource_dir() {
                    let mut binary_path = resource_dir.join("idenva-backend");
                    if cfg!(target_os = "windows") {
                        binary_path.set_extension("exe");
                    }

                    if !binary_path.exists() {
                        if let Some(parent_dir) = resource_dir.parent() {
                            let mut parent_binary = parent_dir.join("idenva-backend");
                            if cfg!(target_os = "windows") {
                                parent_binary.set_extension("exe");
                            }
                            if parent_binary.exists() {
                                binary_path = parent_binary;
                            }
                        }
                    }

                    if binary_path.exists() {
                        let _ = Command::new(binary_path).spawn();
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}