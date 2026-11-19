//! Checagem de Root, limpeza de proxy/VPN, verificação da Play Store e Google One.

use crate::adb;
use std::time::Duration;

pub const PKG_GOOGLE_ONE: &str = "com.google.android.apps.subscriptions.red";
pub const PKG_VENDING: &str = "com.android.vending";

const CLASH_PACKAGES: &[&str] = &["com.github.metacubex.clash.meta", "com.github.kr328.clash"];

/// Garante acesso root no dispositivo (`adb root` ou `su`).
pub async fn ensure_root(adb_path: &str, serial: &str) -> Result<(), String> {
    let uid = adb::shell(adb_path, serial, "id").await.unwrap_or_default();
    if uid.contains("uid=0") {
        return Ok(());
    }

    let _ = adb::root(adb_path, serial).await;
    tokio::time::sleep(Duration::from_secs(2)).await;

    let uid = adb::shell(adb_path, serial, "id").await.unwrap_or_default();
    if uid.contains("uid=0") {
        return Ok(());
    }

    let su_uid = adb::shell(adb_path, serial, "su -c id")
        .await
        .unwrap_or_default();
    if su_uid.contains("uid=0") {
        return Ok(());
    }

    Err("Dispositivo sem permissão root. No MuMu Player 12, ative 'Permissão ROOT' nas configurações e reinicie.".to_string())
}

/// Limpa `http_proxy` global para `:0` e encerra apps Clash que possam interceptar a Play Store.
pub async fn ensure_network(adb_path: &str, serial: &str) -> Result<Vec<String>, String> {
    let mut actions = Vec::new();

    let proxy = adb::shell(adb_path, serial, "settings get global http_proxy")
        .await
        .unwrap_or_default();
    let proxy_trimmed = proxy.trim();
    if !proxy_trimmed.is_empty() && proxy_trimmed != "null" && proxy_trimmed != ":0" {
        adb::shell(adb_path, serial, "settings put global http_proxy :0").await?;
        actions.push(format!("Proxy global limpo (era '{}')", proxy_trimmed));
    }

    for pkg in CLASH_PACKAGES {
        let cmd = format!("pm path {}", pkg);
        let path_out = adb::shell(adb_path, serial, &cmd).await.unwrap_or_default();
        if path_out.contains("package:") {
            let stop_cmd = format!("am force-stop {}", pkg);
            let _ = adb::shell(adb_path, serial, &stop_cmd).await;
            actions.push(format!("VPN {} encerrada temporariamente", pkg));
        }
    }

    Ok(actions)
}

/// Garante que a Google Play Store (`com.android.vending`) esteja em execução.
pub async fn ensure_vending(adb_path: &str, serial: &str) -> Result<(), String> {
    let check_cmd = format!("pidof {}", PKG_VENDING);
    let pid = adb::shell(adb_path, serial, &check_cmd)
        .await
        .unwrap_or_default();
    if !pid.trim().is_empty() {
        return Ok(());
    }

    let launch_cmd = format!(
        "monkey -p {} -c android.intent.category.LAUNCHER 1",
        PKG_VENDING
    );
    adb::shell(adb_path, serial, &launch_cmd).await?;

    for _ in 0..20 {
        tokio::time::sleep(Duration::from_secs(1)).await;
        let pid = adb::shell(adb_path, serial, &check_cmd)
            .await
            .unwrap_or_default();
        if !pid.trim().is_empty() {
            tokio::time::sleep(Duration::from_secs(2)).await;
            return Ok(());
        }
    }

    Err("Google Play Store (com.android.vending) não iniciou a tempo. Abra a Play Store manualmente no emulador.".to_string())
}

/// Verifica se o pacote do Google One (`com.google.android.apps.subscriptions.red`) está instalado.
pub async fn check_google_one(adb_path: &str, serial: &str) -> Result<String, String> {
    let cmd = format!("pm path {}", PKG_GOOGLE_ONE);
    let out = adb::shell(adb_path, serial, &cmd).await.unwrap_or_default();
    if out.contains("package:") {
        Ok(out)
    } else {
        Err(format!(
            "Google One ({}) não está instalado no emulador.",
            PKG_GOOGLE_ONE
        ))
    }
}

/// Lê a ABI principal do emulador (`getprop ro.product.cpu.abi`).
pub async fn get_abi(adb_path: &str, serial: &str) -> Result<String, String> {
    let abi = adb::shell(adb_path, serial, "getprop ro.product.cpu.abi").await?;
    let trimmed = abi.trim().to_string();
    if trimmed.is_empty() {
        Err("Não foi possível detectar a arquitetura (ro.product.cpu.abi) do emulador.".to_string())
    } else {
        Ok(trimmed)
    }
}

/// Reinicia o Google One e retorna o PID ativo para injeção via `frida-inject`.
pub async fn launch_google_one(adb_path: &str, serial: &str) -> Result<u32, String> {
    let cleanup_cmd = format!(
        "killall -9 frida-inject 2>/dev/null; \
         su -c 'killall -9 frida-inject' 2>/dev/null; \
         am force-stop {}; \
         input keyevent 3",
        PKG_GOOGLE_ONE
    );
    let _ = adb::shell(adb_path, serial, &cleanup_cmd).await;
    tokio::time::sleep(Duration::from_millis(400)).await;

    let start_cmd = format!(
        "monkey -p {} -c android.intent.category.LAUNCHER 1",
        PKG_GOOGLE_ONE
    );
    adb::shell(adb_path, serial, &start_cmd).await?;

    let pid_cmd = format!("pidof {}", PKG_GOOGLE_ONE);
    for _ in 0..20 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        let out = adb::shell(adb_path, serial, &pid_cmd)
            .await
            .unwrap_or_default();
        if let Some(first) = out.split_whitespace().next() {
            if let Ok(pid) = first.parse::<u32>() {
                // Aguarda a Activity principal inicializar antes de anexar o frida-inject.
                tokio::time::sleep(Duration::from_secs(2)).await;
                return Ok(pid);
            }
        }
    }

    Err("Google One não iniciou ou não retornou PID válido.".to_string())
}
