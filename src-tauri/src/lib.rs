pub mod adb;
pub mod commands;
pub mod device;
pub mod runner;
pub mod sqlite_token;
pub mod types;

use types::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::check_environment,
            commands::list_offers,
            commands::start_step,
            commands::cancel_active_task,
            commands::open_subscriptions_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
