use tauri::{Manager, RunEvent};
use std::process::{Command, Child};
use std::sync::{Arc, Mutex};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_process: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let backend_process_clone = Arc::clone(&backend_process);

    tauri::Builder::default()
        .setup(move |app| {
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
                        cmd.creation_flags(0x08000000); // Pas de fenêtre console
                        
                        if let Ok(child) = cmd.spawn() {
                            let mut process_guard = backend_process_clone.lock().unwrap();
                            *process_guard = Some(child);
                        }
                    }
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Erreur lors de la construction de l'application Tauri")
        .run(move |_app_handle, event| {
            if let RunEvent::Exit = event {
                let mut process_guard = backend_process.lock().unwrap();
                if let Some(mut child) = process_guard.take() {
                    #[cfg(target_os = "windows")]
                    {
                        let pid = child.id();
                        let _ = Command::new("taskkill")
                            .args(["/F", "/T", "/PID", &pid.to_string()])
                            .creation_flags(0x08000000)
                            .status();
                    }
                    
                    #[cfg(not(target_os = "windows"))]
                    {
                        let _ = child.kill();
                    }
                    
                    let _ = child.wait();
                }
            }
        });
}