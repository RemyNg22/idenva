use std::net::{SocketAddr, TcpStream};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{RunEvent, WebviewUrl, WebviewWindowBuilder};

const PORT: u16 = 18492;

fn wait_for_port(timeout: Duration) -> bool {
    let addr: SocketAddr = ([127, 0, 0, 1], PORT).into();
    let start = Instant::now();
    while start.elapsed() < timeout {
        if TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    false
}

fn spawn_backend() -> Option<Child> {
    let exe = std::env::current_exe().ok()?;
    let name = if cfg!(windows) { "idenva-backend.exe" } else { "idenva-backend" };
    let path = exe.parent()?.join(name);
    if !path.exists() {
        eprintln!("backend introuvable: {:?}", path);
        return None;
    }
    let mut cmd = Command::new(path);
    cmd.env("IDENVA_PARENT_PID", std::process::id().to_string());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd.spawn().ok()
}

fn kill_child(child: &mut Child) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &child.id().to_string()])
            .creation_flags(0x08000000)
            .status();
    }
    #[cfg(not(windows))]
    {
        let _ = child.kill();
    }
    let _ = child.wait();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let backend_setup = backend.clone();

    let app = tauri::Builder::default()
        .setup(move |app| {
            let url = if cfg!(debug_assertions) {
                "http://localhost:5173".to_string()
            } else {
                *backend_setup.lock().unwrap() = spawn_backend();
                if !wait_for_port(Duration::from_secs(30)) {
                    eprintln!("le backend n'a pas démarré à temps");
                }
                format!("http://127.0.0.1:{}", PORT)
            };
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url.parse().unwrap()))
                .title("Idenva - Digital Identity Manager")
                .inner_size(1280.0, 800.0)
                .resizable(true)
                .build()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("erreur au build de l'app");

    app.run(move |_h, event| {
        if let RunEvent::Exit = event {
            if let Some(mut c) = backend.lock().unwrap().take() {
                kill_child(&mut c);
            }
        }
    });
}