//! Download/cache do frida-inject-16.5.9, envio do module_521.apk e streaming JSON via stdout.

use crate::adb;
use crate::device;
use crate::types::{OfferItem, SolariEvent, StepId};
use std::io::{self, Cursor};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

pub const MODULE_APK_BYTES: &[u8] = include_bytes!("../assets/module_521.apk");
pub const BILLING_RUNNER_JS: &str = include_str!("../assets/billing_runner.js");

pub const FRIDA_VERSION: &str = "16.5.9";
pub const SKU_PRO_5TB: &str = "g1.2tb.ai.subs_variant";

pub const REMOTE_MODULE_APK: &str = "/data/local/tmp/module_521.apk";
pub const REMOTE_FRIDA_INJECT: &str = "/data/local/tmp/frida-inject";
pub const REMOTE_JS_PATH: &str = "/data/local/tmp/solari_task.js";

const SOLARI_PREFIX: &str = "__SOLARI__";

#[derive(Debug, Clone)]
pub enum TaskMode {
    ListOffers,
    ExecuteStep { step_id: StepId, old_token: String },
}

pub fn now_timestamp() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let s = secs % 60;
    let m = (secs / 60) % 60;
    let h = (secs / 3600) % 24;
    format!("{:02}:{:02}:{:02}", h, m, s)
}

pub fn emit_event(app: &AppHandle, event: SolariEvent) {
    let _ = app.emit("solari://event", &event);
}

pub fn emit_log(app: &AppHandle, level: &str, message: impl Into<String>) {
    emit_event(
        app,
        SolariEvent::Log {
            level: level.to_string(),
            message: message.into(),
            timestamp: now_timestamp(),
        },
    );
}

fn abi_to_frida_arch(abi: &str) -> &'static str {
    match abi.trim() {
        "arm64-v8a" => "arm64",
        "armeabi-v7a" | "armeabi" => "arm",
        "x86_64" => "x86_64",
        "x86" => "x86",
        _ => "arm64",
    }
}

fn period_to_months(period: &str) -> u32 {
    match period.trim() {
        "P1Y" | "P12M" => 12,
        "P6M" => 6,
        "P3M" => 3,
        "P1M" => 1,
        _ => 0,
    }
}

/// Garante o binário `frida-inject-16.5.9-android-<arch>` em `%LOCALAPPDATA%\Solari\bin\`.
pub async fn ensure_frida_inject_cached(
    abi: &str,
    app: Option<&AppHandle>,
) -> Result<PathBuf, String> {
    let arch = abi_to_frida_arch(abi);
    let bin_dir = adb::solari_bin_dir()?;
    let cached_path = bin_dir.join(format!("frida-inject-{}-android-{}", FRIDA_VERSION, arch));

    if let Ok(meta) = tokio::fs::metadata(&cached_path).await {
        if meta.is_file() && meta.len() > 0 {
            return Ok(cached_path);
        }
    }

    tokio::fs::create_dir_all(&bin_dir)
        .await
        .map_err(|e| format!("Falha ao criar diretório {}: {}", bin_dir.display(), e))?;

    let url = format!(
        "https://github.com/frida/frida/releases/download/{0}/frida-inject-{0}-android-{1}.xz",
        FRIDA_VERSION, arch
    );

    if let Some(a) = app {
        emit_log(
            a,
            "info",
            format!("Baixando frida-inject {} ({})...", FRIDA_VERSION, arch),
        );
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|e| format!("Falha ao inicializar cliente HTTP: {}", e))?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Falha ao baixar frida-inject de {}: {}", url, e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Erro HTTP {} ao baixar frida-inject ({}).",
            resp.status(),
            url
        ));
    }

    let compressed = resp
        .bytes()
        .await
        .map_err(|e| format!("Falha ao ler download do frida-inject: {}", e))?;

    let dest_clone = cached_path.clone();
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let mut decoder = xz2::read::XzDecoder::new(Cursor::new(compressed));
        let tmp_dest = dest_clone.with_extension("tmp");
        let mut out_file = std::fs::File::create(&tmp_dest)
            .map_err(|e| format!("Falha ao criar {}: {}", tmp_dest.display(), e))?;
        io::copy(&mut decoder, &mut out_file)
            .map_err(|e| format!("Falha ao descompactar frida-inject (.xz): {}", e))?;
        std::fs::rename(&tmp_dest, &dest_clone)
            .map_err(|e| format!("Falha ao salvar {}: {}", dest_clone.display(), e))?;
        Ok(())
    })
    .await
    .map_err(|e| format!("Erro na tarefa de descompactação do frida-inject: {}", e))??;

    Ok(cached_path)
}

/// Garante `frida-inject` e `module_521.apk` presentes em `/data/local/tmp/` no emulador.
pub async fn prepare_device_binaries(
    adb_path: &str,
    serial: &str,
    abi: &str,
    app: Option<&AppHandle>,
) -> Result<(), String> {
    let frida_exists = adb::shell(
        adb_path,
        serial,
        &format!("[ -s {} ] && echo ok", REMOTE_FRIDA_INJECT),
    )
    .await
    .unwrap_or_default();

    if frida_exists.trim() != "ok" {
        let local_frida = ensure_frida_inject_cached(abi, app).await?;
        if let Some(a) = app {
            emit_log(a, "info", "Enviando frida-inject para o emulador...");
        }
        adb::push(adb_path, serial, &local_frida, REMOTE_FRIDA_INJECT).await?;
        adb::shell(adb_path, serial, &format!("chmod 755 {}", REMOTE_FRIDA_INJECT)).await?;
    }

    let module_exists = adb::shell(
        adb_path,
        serial,
        &format!("[ -s {} ] && echo ok", REMOTE_MODULE_APK),
    )
    .await
    .unwrap_or_default();

    if module_exists.trim() != "ok" {
        if let Some(a) = app {
            emit_log(a, "info", "Enviando module_521.apk para o emulador...");
        }
        let tmp_apk = std::env::temp_dir().join(format!("solari_mod_{}.apk", std::process::id()));
        tokio::fs::write(&tmp_apk, MODULE_APK_BYTES)
            .await
            .map_err(|e| format!("Falha ao gravar module_521.apk temporário: {}", e))?;
        let push_res = adb::push(adb_path, serial, &tmp_apk, REMOTE_MODULE_APK).await;
        let _ = tokio::fs::remove_file(&tmp_apk).await;
        push_res?;
    }

    Ok(())
}

/// Parametriza o template `BILLING_RUNNER_JS` com os valores da tarefa atual.
pub fn build_task_js(
    prefer: &str,
    list_only: bool,
    old_token: &str,
    stack_mode: Option<u32>,
) -> Result<String, String> {
    let products_json = serde_json::to_string(&[SKU_PRO_5TB])
        .map_err(|e| format!("Erro ao serializar PRODUCTS: {}", e))?;
    let prefer_json = serde_json::to_string(&prefer)
        .map_err(|e| format!("Erro ao serializar PREFER: {}", e))?;
    let list_only_str = if list_only { "true" } else { "false" };
    let old_token_json = serde_json::to_string(&old_token)
        .map_err(|e| format!("Erro ao serializar OLD_TOKEN: {}", e))?;
    let stack_mode_str = match stack_mode {
        Some(m) => m.to_string(),
        None => "null".to_string(),
    };

    Ok(BILLING_RUNNER_JS
        .replace("__PRODUCTS__", &products_json)
        .replace("__PREFER__", &prefer_json)
        .replace("__LIST_ONLY__", list_only_str)
        .replace("__OLD_TOKEN__", &old_token_json)
        .replace("__STACK_MODE__", &stack_mode_str))
}

async fn kill_child(child: &mut tokio::process::Child, active_child_pid: &Arc<Mutex<Option<u32>>>) {
    let pid = {
        let mut guard = active_child_pid.lock().await;
        guard.take()
    };

    #[cfg(windows)]
    if let Some(p) = pid {
        let mut cmd = Command::new("taskkill");
        adb::configure_command(&mut cmd);
        cmd.args(["/F", "/T", "/PID", &p.to_string()]);
        let _ = cmd.output().await;
    }

    let _ = child.kill().await;
    let _ = child.wait().await;
}

/// Executa o `frida-inject` em streaming e processa eventos `__SOLARI__`.
pub async fn run_billing_task(
    app: &AppHandle,
    active_child_pid: Arc<Mutex<Option<u32>>>,
    adb_path: &str,
    serial: &str,
    abi: &str,
    mode: TaskMode,
) -> Result<Vec<OfferItem>, String> {
    prepare_device_binaries(adb_path, serial, abi, Some(app)).await?;
    device::ensure_vending(adb_path, serial).await?;

    emit_log(app, "info", "Iniciando Google One no emulador...");
    let target_pid = device::launch_google_one(adb_path, serial).await?;
    emit_log(app, "info", format!("Google One ativo (PID {}).", target_pid));

    let (prefer, list_only, old_token, stack_mode, timeout_secs) = match &mode {
        TaskMode::ListOffers => ("", true, "", None, 90u64),
        TaskMode::ExecuteStep { step_id, old_token } => (
            step_id.offer_id(),
            false,
            old_token.as_str(),
            if step_id.requires_token() { Some(5) } else { None },
            600u64,
        ),
    };

    let js_content = build_task_js(prefer, list_only, old_token, stack_mode)?;
    let local_js = std::env::temp_dir().join(format!("solari_task_{}.js", std::process::id()));
    tokio::fs::write(&local_js, js_content.as_bytes())
        .await
        .map_err(|e| format!("Falha ao gravar solari_task.js temporário: {}", e))?;
    let push_js_res = adb::push(adb_path, serial, &local_js, REMOTE_JS_PATH).await;
    let _ = tokio::fs::remove_file(&local_js).await;
    push_js_res?;

    let remote_cmd = format!(
        "{} -p {} -s {}",
        REMOTE_FRIDA_INJECT, target_pid, REMOTE_JS_PATH
    );

    let mut cmd = Command::new(adb_path);
    adb::configure_command(&mut cmd);
    cmd.args(["-s", serial, "shell", &remote_cmd])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Falha ao iniciar frida-inject via adb: {}", e))?;

    {
        let mut guard = active_child_pid.lock().await;
        *guard = child.id();
    }

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Falha ao capturar stdout do frida-inject.".to_string())?;
    let stderr = child.stderr.take();

    if let Some(err_stream) = stderr {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let mut err_lines = BufReader::new(err_stream).lines();
            while let Ok(Some(line)) = err_lines.next_line().await {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    emit_log(&app_clone, "warn", format!("[stderr] {}", trimmed));
                }
            }
        });
    }

    let mut lines = BufReader::new(stdout).lines();
    let mut offers = Vec::new();
    let mut completed = false;
    let mut fatal_error: Option<String> = None;

    let deadline = tokio::time::sleep(Duration::from_secs(timeout_secs));
    tokio::pin!(deadline);

    loop {
        tokio::select! {
            _ = &mut deadline => {
                fatal_error = Some(format!("Tempo limite ({}s) excedido aguardando resposta do BillingClient.", timeout_secs));
                break;
            }
            line_res = lines.next_line() => {
                match line_res {
                    Ok(Some(line)) => {
                        let Some(idx) = line.find(SOLARI_PREFIX) else {
                            continue;
                        };
                        let json_str = line[idx + SOLARI_PREFIX.len()..].trim();
                        let Ok(val) = serde_json::from_str::<serde_json::Value>(json_str) else {
                            continue;
                        };
                        let ev = val.get("ev").and_then(|v| v.as_str()).unwrap_or("");
                        match ev {
                            "offer" => {
                                let product = val.get("product").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let offer_id = val.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let micros = val.get("micros").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let period = val.get("period").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let token = val.get("token").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let title = val.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let name = val.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let months = period_to_months(&period);
                                let is_free = micros == "0";

                                let offer = OfferItem {
                                    product,
                                    offer_id,
                                    micros,
                                    period,
                                    token,
                                    title,
                                    name,
                                    months,
                                    is_free,
                                };
                                offers.push(offer.clone());
                                emit_event(app, SolariEvent::Offer { offer });
                            }
                            "list_only" => {
                                completed = true;
                                break;
                            }
                            "chosen" => {
                                let product = val.get("product").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let offer_id = val.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let period = val.get("period").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                emit_event(app, SolariEvent::Chosen { product, offer_id, period });
                            }
                            "launched" => {
                                if let TaskMode::ExecuteStep { step_id, .. } = mode {
                                    let code = val.get("code").and_then(|v| v.as_i64()).unwrap_or(-1) as i32;
                                    let msg = val.get("msg").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                    emit_event(app, SolariEvent::Launched { step_id, code, msg: msg.clone() });

                                    if code == 0 {
                                        let instruction = "Checkout aberto no emulador! Confira se hoje está R$ 0,00, conclua a assinatura na Play Store e clique no próximo passo.".to_string();
                                        emit_log(app, "ok", &instruction);
                                        emit_event(
                                            app,
                                            SolariEvent::StepDone {
                                                step_id,
                                                success: true,
                                                message: instruction,
                                            },
                                        );
                                        completed = true;
                                        break;
                                    } else {
                                        fatal_error = Some(format!(
                                            "Falha ao abrir checkout da Google Play (código {}): {}",
                                            code, msg
                                        ));
                                        break;
                                    }
                                }
                            }
                            "purchase_cb" => {
                                if let TaskMode::ExecuteStep { step_id, .. } = mode {
                                    let code = val.get("code").and_then(|v| v.as_i64()).unwrap_or(-1) as i32;
                                    let msg = val.get("msg").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                    emit_event(app, SolariEvent::PurchaseCb { step_id, code, msg: msg.clone() });

                                    let success = code == 0;
                                    let summary = if success {
                                        "Assinatura confirmada (code = 0).".to_string()
                                    } else {
                                        format!("Checkout finalizado com código {}: {}", code, msg)
                                    };
                                    emit_event(app, SolariEvent::StepDone { step_id, success, message: summary });
                                }
                                completed = true;
                                break;
                            }
                            "no_trial" => {
                                fatal_error = Some("Nenhuma oferta gratuita elegível encontrada para esta etapa.".to_string());
                                break;
                            }
                            "no_activity" => {
                                fatal_error = Some("Não foi possível localizar a Activity do Google One para abrir o checkout.".to_string());
                                break;
                            }
                            "boot_err" | "boot_fail" | "query_err" | "launch_err" | "launch_outer_err" => {
                                let detail = val.get("m").and_then(|v| v.as_str()).unwrap_or("erro desconhecido");
                                fatal_error = Some(format!("Erro no runner Android ({}): {}", ev, detail));
                                break;
                            }
                            "act_thread_err" | "choose_err" | "mode_err" | "stack_param_err" | "disc" => {
                                let detail = val.get("m").and_then(|v| v.as_str()).unwrap_or("");
                                emit_log(app, "warn", format!("[{}] {}", ev, detail));
                            }
                            _ => {
                                emit_log(app, "info", format!("[{}] {}", ev, json_str));
                            }
                        }
                    }
                    Ok(None) => {
                        break;
                    }
                    Err(e) => {
                        fatal_error = Some(format!("Erro ao ler saída do frida-inject: {}", e));
                        break;
                    }
                }
            }
        }
    }

    let was_cancelled = {
        let guard = active_child_pid.lock().await;
        guard.is_none()
    };

    kill_child(&mut child, &active_child_pid).await;

    if let Some(err_msg) = fatal_error {
        emit_event(
            app,
            SolariEvent::Error {
                message: err_msg.clone(),
            },
        );
        if let TaskMode::ExecuteStep { step_id, .. } = mode {
            emit_event(
                app,
                SolariEvent::StepDone {
                    step_id,
                    success: false,
                    message: err_msg.clone(),
                },
            );
        }
        return Err(err_msg);
    }

    if !completed {
        if was_cancelled {
            emit_event(app, SolariEvent::Cancelled);
            return Err("Operação cancelada pelo usuário.".to_string());
        }
        let msg = "O processo frida-inject encerrou antes de concluir a operação.".to_string();
        emit_event(app, SolariEvent::Error { message: msg.clone() });
        if let TaskMode::ExecuteStep { step_id, .. } = mode {
            emit_event(
                app,
                SolariEvent::StepDone {
                    step_id,
                    success: false,
                    message: msg.clone(),
                },
            );
        }
        return Err(msg);
    }

    Ok(offers)
}
