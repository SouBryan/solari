//! Extração do purchaseToken vigente a partir do library.db usando rusqlite.

use crate::adb;
use rusqlite::{Connection, OpenFlags};
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const VENDING_LIBRARY_DB: &str = "/data/data/com.android.vending/databases/library.db";
const REMOTE_TMP_DB: &str = "/data/local/tmp/lib_read.db";

#[derive(Debug, Clone)]
pub struct TokenInfo {
    pub token: String,
    pub account: String,
    pub is_valid: bool,
}

async fn try_read_once(adb_path: &str, serial: &str, sku_filter: &str) -> Result<Option<TokenInfo>, String> {
    let copy_cmd = format!(
        "rm -f {tmp} {tmp}-wal {tmp}-shm && \
         (cp {src} {tmp} || su -c 'cp {src} {tmp}') && \
         (cp {src}-wal {tmp}-wal 2>/dev/null || su -c 'cp {src}-wal {tmp}-wal' 2>/dev/null || true) && \
         (cp {src}-shm {tmp}-shm 2>/dev/null || su -c 'cp {src}-shm {tmp}-shm' 2>/dev/null || true) && \
         (chmod 666 {tmp}* || su -c 'chmod 666 {tmp}*')",
        src = VENDING_LIBRARY_DB,
        tmp = REMOTE_TMP_DB
    );
    adb::shell(adb_path, serial, &copy_cmd).await?;

    let local_db: PathBuf = std::env::temp_dir().join(format!(
        "solari_lib_read_{}.db",
        std::process::id()
    ));
    let local_wal: PathBuf = std::env::temp_dir().join(format!(
        "solari_lib_read_{}.db-wal",
        std::process::id()
    ));
    let local_shm: PathBuf = std::env::temp_dir().join(format!(
        "solari_lib_read_{}.db-shm",
        std::process::id()
    ));

    let _ = tokio::fs::remove_file(&local_db).await;
    let _ = tokio::fs::remove_file(&local_wal).await;
    let _ = tokio::fs::remove_file(&local_shm).await;

    adb::pull(adb_path, serial, REMOTE_TMP_DB, &local_db).await?;
    let _ = adb::pull(adb_path, serial, &format!("{}-wal", REMOTE_TMP_DB), &local_wal).await;
    let _ = adb::pull(adb_path, serial, &format!("{}-shm", REMOTE_TMP_DB), &local_shm).await;

    let local_clone = local_db.clone();
    let filter_pattern = format!("%{}%", sku_filter);

    let res = tokio::task::spawn_blocking(move || -> Result<Option<TokenInfo>, String> {
        let conn = Connection::open_with_flags(
            &local_clone,
            OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .or_else(|_| Connection::open_with_flags(&local_clone, OpenFlags::SQLITE_OPEN_READ_ONLY))
        .map_err(|e| format!("Falha ao abrir cópia do library.db: {}", e))?;

        let mut stmt = conn
            .prepare(
                "SELECT account, subs_valid_until_time, inapp_purchase_data \
                 FROM ownership WHERE doc_id LIKE ?1",
            )
            .map_err(|e| format!("Falha ao preparar query no library.db: {}", e))?;

        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        let rows = stmt
            .query_map([&filter_pattern], |row| {
                let account: Option<String> = row.get(0)?;
                let valid_until: Option<i64> = row.get(1)?;
                let data: Option<String> = row.get(2)?;
                Ok((account, valid_until, data))
            })
            .map_err(|e| format!("Falha ao consultar tabela ownership: {}", e))?;

        let mut picked: Option<(String, String, bool, i64)> = None;

        for row_res in rows {
            let Ok((account_opt, valid_opt, data_opt)) = row_res else {
                continue;
            };
            let Some(data) = data_opt else {
                continue;
            };
            let Ok(json) = serde_json::from_str::<serde_json::Value>(&data) else {
                continue;
            };
            let Some(token) = json.get("purchaseToken").and_then(|v| v.as_str()) else {
                continue;
            };
            if token.is_empty() {
                continue;
            }

            let valid_until = valid_opt.unwrap_or(0);
            let alive = valid_until > now_ms;
            let account = account_opt.unwrap_or_else(|| "desconhecida".to_string());

            let should_replace = match &picked {
                None => true,
                Some((_, _, prev_alive, prev_valid)) => {
                    (alive && !*prev_alive) || (alive == *prev_alive && valid_until > *prev_valid)
                }
            };

            if should_replace {
                picked = Some((token.to_string(), account, alive, valid_until));
            }
        }

        Ok(picked.map(|(token, account, is_valid, _)| TokenInfo {
            token,
            account,
            is_valid,
        }))
    })
    .await
    .map_err(|e| format!("Erro na tarefa de leitura SQLite: {}", e))?;

    let _ = tokio::fs::remove_file(&local_db).await;
    let _ = tokio::fs::remove_file(&local_wal).await;
    let _ = tokio::fs::remove_file(&local_shm).await;
    res
}

/// Lê o `purchaseToken` mais recente/válido no `library.db` da Play Store com retry curto.
pub async fn read_purchase_token(
    adb_path: &str,
    serial: &str,
    sku_filter: &str,
) -> Result<TokenInfo, String> {
    const MAX_ATTEMPTS: usize = 2;
    let mut last_err: Option<String> = None;

    for attempt in 1..=MAX_ATTEMPTS {
        match try_read_once(adb_path, serial, sku_filter).await {
            Ok(Some(info)) => return Ok(info),
            Ok(None) => {
                last_err = Some(format!(
                    "Nenhum purchaseToken encontrado para '{}' no library.db.",
                    sku_filter
                ));
            }
            Err(e) => {
                last_err = Some(e);
            }
        }

        if attempt < MAX_ATTEMPTS {
            tokio::time::sleep(Duration::from_millis(600)).await;
        }
    }

    Err(last_err.unwrap_or_else(|| {
        "Não foi possível obter o purchaseToken do library.db.".to_string()
    }))
}
