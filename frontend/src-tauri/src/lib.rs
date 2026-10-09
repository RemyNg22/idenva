use tauri::{Manager, RunEvent};
use std::process::{Command, Child};
use std::sync::{Arc, Mutex};
use std::net::TcpStream;
use std::io::{Write, Read};
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
                        cmd.creation_flags(0x08000000); // Pas de fenêtre console
                        
                        if let Ok(child) = cmd.spawn() {
                            let mut process_guard = backend_process_clone.lock().unwrap();
                            *process_guard = Some(child);
                        }
                    }
                }

                // Attente active : vérification HTTP de la route /health
                let mut retries = 0;
                while retries < 50 {
                    if let Ok(mut stream) = TcpStream::connect_timeout(
                        &"127.0.0.1:8000".parse().unwrap(), 
                        Duration::from_millis(200)
                    ) {
                        let _ = stream.set_read_timeout(Some(Duration::from_millis(200)));
                        let request = "GET /health HTTP/1.1\r\nHost: 127.0.0.1:8000\r\nConnection: close\r\n\r\n";
                        
                        if stream.write_all(request.as_bytes()).is_ok() {
                            let mut response = [0; 128];
                            if let Ok(bytes_read) = stream.read(&mut response) {
                                let resp_str = String::from_utf8_lossy(&response[..bytes_read]);
                                if resp_str.contains("200 OK") {
                                    break;
                                }
                            }
                        }
                    }
                    thread::sleep(Duration::from_millis(150));
                    retries += 1;
                }
            }
            
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
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