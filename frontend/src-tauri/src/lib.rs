use tauri::Manager;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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
                    
                    if binary_path.exists() {
                        let mut cmd = Command::new(binary_path);
                        #[cfg(target_os = "windows")]
                        cmd.creation_flags(0x08000000);
                        
                        let _ = cmd.spawn();
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}