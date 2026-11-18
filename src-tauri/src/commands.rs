use crate::types::{AppState, EnvReport, OfferItem, StepId};
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn check_environment(
    _app: AppHandle,
    _state: State<'_, AppState>,
) -> Result<EnvReport, String> {
    Err("Backend check_environment ainda não implementado.".to_string())
}

#[tauri::command]
pub async fn list_offers(
    _app: AppHandle,
    _state: State<'_, AppState>,
) -> Result<Vec<OfferItem>, String> {
    Err("Backend list_offers ainda não implementado.".to_string())
}

#[tauri::command]
pub async fn start_step(
    _app: AppHandle,
    _state: State<'_, AppState>,
    _step_id: StepId,
) -> Result<(), String> {
    Err("Backend start_step ainda não implementado.".to_string())
}

#[tauri::command]
pub async fn cancel_active_task(_state: State<'_, AppState>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn open_subscriptions_url() -> Result<(), String> {
    Ok(())
}
