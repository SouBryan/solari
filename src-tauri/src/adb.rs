//! Descoberta/download do adb.exe, conexão com emulador e wrappers adb shell/push/pull.

use std::io::{self, Cursor};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::process::Command;

pub const PLATFORM_TOOLS_URL: &str =
    "https://dl.google.com/android/repository/platform-tools-latest-windows.zip";

pub const EMULATOR_PORTS: &[&str] = &["16384", "7555", "16416", "21503", "62001"];

/// Aplica `CREATE_NO_WINDOW` (`0x08000000`) no Windows para evitar janelas CMD piscando.
pub fn configure_command(cmd: &mut Command) {
    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000);
    }
    #[cfg(not(windows))]
    {
        let _ = cmd;
    }
}

/// Retorna o diretório de cache de binários do Solari (`%LOCALAPPDATA%\Solari\bin`).
pub fn solari_bin_dir() -> Result<PathBuf, String> {
    #[cfg(windows)]
    {
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            if !local.trim().is_empty() {
                return Ok(PathBuf::from(local).join("Solari").join("bin"));
            }
        }
        if let Ok(profile) = std::env::var("USERPROFILE") {
            if !profile.trim().is_empty() {
                return Ok(PathBuf::from(profile)
                    .join("AppData")
                    .join("Local")
                    .join("Solari")
                    .join("bin"));
            }
        }
        Err("Não foi possível resolver %LOCALAPPDATA% para cache do Solari.".to_string())
    }
    #[cfg(not(windows))]
    {
        if let Ok(home) = std::env::var("HOME") {
            if !home.trim().is_empty() {
                return Ok(PathBuf::from(home)
                    .join(".local")
                    .join("share")
                    .join("solari")
                    .join("bin"));
            }
        }
        Ok(std::env::temp_dir().join("solari-bin"))
    }
}

fn candidate_adb_paths() -> Vec<PathBuf> {
    let mut list = Vec::new();

    if let Ok(env_adb) = std::env::var("ADB_PATH") {
        let trimmed = env_adb.trim();
        if !trimmed.is_empty() {
            list.push(PathBuf::from(trimmed));
        }
    }

    if let Ok(bin_dir) = solari_bin_dir() {
        #[cfg(windows)]
        list.push(bin_dir.join("platform-tools").join("adb.exe"));
        #[cfg(not(windows))]
        list.push(bin_dir.join("platform-tools").join("adb"));
    }

    #[cfg(windows)]
    {
        let mumu_paths = [
            r"C:\Program Files\Netease\MuMuPlayer-12.0\shell\adb.exe",
            r"C:\Program Files\Netease\MuMuPlayerGlobal-12.0\shell\adb.exe",
            r"C:\Program Files (x86)\Netease\MuMuPlayer-12.0\shell\adb.exe",
            r"C:\Program Files\Netease\MuMu\nx_main\adb.exe",
            r"C:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe",
            r"D:\Program Files\Netease\MuMu\nx_main\adb.exe",
            r"D:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe",
            r"D:\Program Files\Netease\MuMuPlayer-12.0\shell\adb.exe",
            r"C:\Program Files\Netease\MuMu\emulator\nemu\vmonitor\bin\adb_server.exe",
        ];
        for p in mumu_paths {
            list.push(PathBuf::from(p));
        }

        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            if !local.trim().is_empty() {
                list.push(
                    PathBuf::from(local)
                        .join("Android")
                        .join("Sdk")
                        .join("platform-tools")
                        .join("adb.exe"),
                );
            }
        }
    }

    list
}

async fn test_adb_executable(path: &str) -> bool {
    let mut cmd = Command::new(path);
    configure_command(&mut cmd);
    cmd.arg("version");
    match tokio::time::timeout(Duration::from_secs(5), cmd.output()).await {
        Ok(Ok(out)) => out.status.success(),
        _ => false,
    }
}

/// Procura `adb.exe` no `ADB_PATH`, cache do Solari, caminhos padrão do MuMu Player 12 e `PATH`.
pub async fn find_adb() -> Option<String> {
    for path in candidate_adb_paths() {
        if path.is_file() {
            let s = path.to_string_lossy().to_string();
            if test_adb_executable(&s).await {
                return Some(s);
            }
        }
    }

    for name in ["adb.exe", "adb"] {
        if test_adb_executable(name).await {
            return Some(name.to_string());
        }
    }

    None
}

/// Baixa e extrai `platform-tools-latest-windows.zip` em `%LOCALAPPDATA%\Solari\bin\`.
pub async fn download_platform_tools() -> Result<String, String> {
    let bin_dir = solari_bin_dir()?;
    tokio::fs::create_dir_all(&bin_dir)
        .await
        .map_err(|e| format!("Falha ao criar diretório {}: {}", bin_dir.display(), e))?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|e| format!("Falha ao inicializar cliente HTTP: {}", e))?;

    let resp = client
        .get(PLATFORM_TOOLS_URL)
        .send()
        .await
        .map_err(|e| format!("Falha ao baixar platform-tools: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Erro HTTP {} ao baixar platform-tools.",
            resp.status()
        ));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Falha ao ler resposta do download de platform-tools: {}", e))?;

    let dest_dir = bin_dir.clone();
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let reader = Cursor::new(bytes);
        let mut archive = zip::ZipArchive::new(reader)
            .map_err(|e| format!("Arquivo platform-tools.zip inválido: {}", e))?;

        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("Erro ao ler entrada {} do zip: {}", i, e))?;

            let Some(enclosed) = file.enclosed_name() else {
                continue;
            };
            let out_path = dest_dir.join(enclosed);

            if file.is_dir() {
                std::fs::create_dir_all(&out_path).map_err(|e| {
                    format!("Falha ao criar diretório {}: {}", out_path.display(), e)
                })?;
            } else {
                if let Some(parent) = out_path.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| {
                        format!("Falha ao criar diretório {}: {}", parent.display(), e)
                    })?;
                }
                let mut outfile = std::fs::File::create(&out_path).map_err(|e| {
                    format!("Falha ao criar arquivo {}: {}", out_path.display(), e)
                })?;
                io::copy(&mut file, &mut outfile).map_err(|e| {
                    format!("Falha ao extrair arquivo {}: {}", out_path.display(), e)
                })?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Erro na tarefa de extração do platform-tools: {}", e))??;

    #[cfg(windows)]
    let adb_exe = bin_dir.join("platform-tools").join("adb.exe");
    #[cfg(not(windows))]
    let adb_exe = bin_dir.join("platform-tools").join("adb");

    if !adb_exe.is_file() {
        return Err(format!(
            "platform-tools extraído, mas {} não foi encontrado.",
            adb_exe.display()
        ));
    }

    Ok(adb_exe.to_string_lossy().to_string())
}

/// Localiza o `adb.exe` ou baixa o `platform-tools` automaticamente caso ausente.
pub async fn find_or_download_adb() -> Result<String, String> {
    if let Some(found) = find_adb().await {
        return Ok(found);
    }
    download_platform_tools().await
}

/// Executa um comando `adb` arbitrário com timeout e `CREATE_NO_WINDOW`.
pub async fn adb_exec(
    adb_path: &str,
    serial: Option<&str>,
    args: &[&str],
    timeout_secs: u64,
) -> Result<String, String> {
    let mut cmd = Command::new(adb_path);
    configure_command(&mut cmd);
    if let Some(s) = serial {
        cmd.arg("-s").arg(s);
    }
    cmd.args(args);

    let output = tokio::time::timeout(Duration::from_secs(timeout_secs), cmd.output())
        .await
        .map_err(|_| format!("Timeout ({}s) executando adb {:?}", timeout_secs, args))?
        .map_err(|e| format!("Falha ao executar adb {:?}: {}", args, e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if !output.status.success() {
        let msg = if !stderr.is_empty() { stderr } else { stdout };
        return Err(format!("adb {:?} falhou: {}", args, msg));
    }

    Ok(stdout)
}

/// Lista os seriais de dispositivos online via `adb devices`.
pub async fn list_devices(adb_path: &str) -> Result<Vec<String>, String> {
    let out = adb_exec(adb_path, None, &["devices"], 10).await?;
    let mut devices = Vec::new();
    for line in out.lines().skip(1) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let mut parts = trimmed.split_whitespace();
        if let (Some(serial), Some(status)) = (parts.next(), parts.next()) {
            if status == "device" {
                devices.push(serial.to_string());
            }
        }
    }
    Ok(devices)
}

/// Garante um emulador conectado, tentando as portas conhecidas caso `adb devices` esteja vazio.
pub async fn connect_emulator(adb_path: &str) -> Result<String, String> {
    let existing = list_devices(adb_path).await.unwrap_or_default();
    if let Some(first) = existing.into_iter().next() {
        return Ok(first);
    }

    for port in EMULATOR_PORTS {
        let addr = format!("127.0.0.1:{}", port);
        let _ = adb_exec(adb_path, None, &["connect", &addr], 5).await;
        let devs = list_devices(adb_path).await.unwrap_or_default();
        if let Some(first) = devs.into_iter().next() {
            return Ok(first);
        }
    }

    Err("Nenhum emulador conectado. Inicie o MuMu Player 12 e ative a depuração ADB.".to_string())
}

/// Executa `adb -s <serial> shell <command>`.
pub async fn shell(adb_path: &str, serial: &str, command: &str) -> Result<String, String> {
    adb_exec(adb_path, Some(serial), &["shell", command], 30).await
}

/// Executa `adb -s <serial> shell <command>` com timeout customizado.
pub async fn shell_timeout(
    adb_path: &str,
    serial: &str,
    command: &str,
    timeout_secs: u64,
) -> Result<String, String> {
    adb_exec(adb_path, Some(serial), &["shell", command], timeout_secs).await
}

/// Executa `adb -s <serial> push <local> <remote>`.
pub async fn push(
    adb_path: &str,
    serial: &str,
    local: &Path,
    remote: &str,
) -> Result<(), String> {
    let local_str = local.to_string_lossy().to_string();
    adb_exec(adb_path, Some(serial), &["push", &local_str, remote], 120).await?;
    Ok(())
}

/// Executa `adb -s <serial> pull <remote> <local>`.
pub async fn pull(
    adb_path: &str,
    serial: &str,
    remote: &str,
    local: &Path,
) -> Result<(), String> {
    let local_str = local.to_string_lossy().to_string();
    adb_exec(adb_path, Some(serial), &["pull", remote, &local_str], 60).await?;
    Ok(())
}

/// Executa `adb -s <serial> root`.
pub async fn root(adb_path: &str, serial: &str) -> Result<String, String> {
    adb_exec(adb_path, Some(serial), &["root"], 20).await
}
