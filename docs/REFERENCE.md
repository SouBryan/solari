# Solari — Referência Técnica do Sistema Legado

Os scripts originais em Python/Batch que serviram de prova de conceito para o **Solari** estão arquivados em [`reference/legacy-cli/`](../reference/legacy-cli/) exclusivamente como referência de regras de negócio e parâmetros Android. Na aplicação final, **toda essa lógica será portada nativamente para Rust** conforme descrito em [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 1. Mapeamento Python Legado -> Módulos Rust do Solari

| Função no `ultra0.py` / `setup_env.py` | Equivalente Nativo em Rust (`src-tauri/src/`) |
| :--- | :--- |
| `find_adb()` + `download_platform_tools()` | `adb.rs` (`reqwest` + `zip` extraindo em `%LOCALAPPDATA%\Solari\bin\platform-tools`) |
| `pick_device()` + `ensure_root()` + `ensure_network()` | `device.rs` (`tokio::process::Command` ocultando janelas CMD com `creation_flags(0x08000000)`) |
| `ensure_vending()` + checagem do Google One | `device.rs` (`pidof com.android.vending` + `pm path com.google.android.apps.subscriptions.red`) |
| `MODULE_B64` (`module_521.apk`) | `assets/module_521.apk` embutido diretamente via `include_bytes!()` |
| `ensure_frida_server()` + `frida.attach()` | `runner.rs` usando o binário standalone `frida-inject-16.5.9-android-<arch>` via `adb shell` + `stdout` JSON |
| `read_purchase_token()` (`sqlite3`) | `sqlite_token.rs` usando `rusqlite` (`bundled`) sobre cópia temporária de `library.db` |
| `FRIDA_JS` + `build_js()` | `assets/billing_runner.js` parametrizado em Rust e enviado para `/data/local/tmp/solari_task.js` |

---

## 2. Regras de Negócio e SKUs Validados

- **Pacote do Google One:** `com.google.android.apps.subscriptions.red`
- **Pacote da Google Play Store:** `com.android.vending`
- **SKU do Google AI Pro (5 TB):** `g1.2tb.ai.subs_variant`
- **Ofertas de Avaliação Gratuita (`micros == "0"`):**
  1. **Passo 1 (`pro12`):** `offerId = "12months-eft"` (`P1Y` — 12 meses, sem `oldPurchaseToken`)
  2. **Passo 2 (`pro6`):** `offerId = "6months-eft"` (`P6M` — +6 meses, com `oldPurchaseToken` + `ReplaceProrationMode = 5`)
  3. **Passo 3 (`pro6b`):** `offerId = "6months-eft-2"` (`P6M` — +6 meses, com `oldPurchaseToken` + `ReplaceProrationMode = 5`)
  4. **Passo 4 (`pro6c`):** `offerId = "6months-eft-ss-2026"` (`P6M` — +6 meses extra, com `oldPurchaseToken` + `ReplaceProrationMode = 5`)

---

## 3. Lições Técnicas Validadas no MuMu Player 12 (Android 12 `x86_64`)

1. **Busca de `Activity` sem `Java.choose`:**
   - No Android 12 (`x86_64`), `Java.choose("android.app.Activity")` falha por ausência do símbolo interno `EnsurePluginLoaded` na `libart.so`.
   - A leitura direta de `ActivityThread.currentActivityThread().mActivities` (já aplicada no JS de referência) resolve 100% do problema e localiza `MainActivity` instantaneamente.

2. **Série `16.5.9` Obrigatória:**
   - Manter fixado o binário Android na versão **`16.5.9`** (`frida-inject-16.5.9-android-<arch>.xz`), pois a série `17.x` desacoplou o suporte `Java` embutido.

3. **Janelas Ocultas no Windows (`CREATE_NO_WINDOW`):**
   - Ao executar `adb.exe` a partir de um app GUI em Rust no Windows, sempre aplicar `.creation_flags(0x08000000)` (`CREATE_NO_WINDOW` de `std::os::windows::process::CommandExt`) para que nenhuma janela preta de terminal pisque na tela do usuário.

4. **Sincronização do `library.db` entre Etapas:**
   - Entre os passos de acumulação (`pro12 -> pro6 -> pro6b -> pro6c`), aguardar brevemente ou consultar `read_purchase_token()` com *retry* curto caso o banco local `/data/data/com.android.vending/databases/library.db` leve alguns segundos para gravar o novo token recém-assinado.
