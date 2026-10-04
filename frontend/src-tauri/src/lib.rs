use tauri::{Manager, RunEvent};
use std::process::{Command, Child};
use std::sync::{Arc, Mutex};
use std::net::TcpStream;
use std::time::Duration;
use std::thread;

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
                        cmd.creation_flags(0x08000000);
                        
                        if let Ok(child) = cmd.spawn() {
                            let mut process_guard = backend_process_clone.lock().unwrap();
                            *process_guard = Some(child);
                        }
                    }
                }

                let mut retries = 0;
                while retries < 30 {
                    if TcpStream::connect_timeout(
                        &"127.0.0.1:8000".parse().unwrap(), 
                        Duration::from_millis(200)
                    ).is_ok() {
                        break;
                    }
                    thread::sleep(Duration::from_millis(200));
                    retries += 1;
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
                    let _ = child.kill();
                }
            }
        });
}