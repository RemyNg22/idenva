use std::process::Command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            #[cfg(not(debug_assertions))]
            {
                // Lance le backend compilé en production
                Command::new("../backend/dist/idenva-backend/idenva-backend.exe")
                    .spawn()
                    .expect("Impossible de démarrer le backend Idenva");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}