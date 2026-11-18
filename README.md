# Solari

**Solari** é uma aplicação desktop nativa para Windows construída **100% em Tauri v2 + Rust (backend) + React/TypeScript (frontend)**, sem nenhuma dependência de Python. Ela transforma todo o fluxo de linha de comando em um assistente visual guiado, leve (~5–8 MB), em português e simples para qualquer usuário final.

---

## Visão Geral do Produto

Em vez de exigir instalação de Python, bibliotecas externas ou execução manual de vários scripts `.bat` na ordem certa, o **Solari** executa toda a orquestração diretamente em **Rust nativo** dentro do `src-tauri`:

1. **Diagnóstico Automático do Ambiente:** Localiza ou baixa o `adb.exe`, conecta ao emulador Android (ex.: MuMu Player 12), verifica permissões, prepara os binários Android necessários e confirma se a Google Play Store e o Google One estão instalados e prontos.
2. **Consulta Visual de Elegibilidade:** Lista em cartões visuais quais ofertas gratuitas estão liberadas para a conta logada no emulador (`12 meses`, `+6 meses`, etc.) sem iniciar nenhuma cobrança.
3. **Assistente Passo a Passo (Wizard de Acumulação):** Conduz o usuário etapa por etapa (`12m -> 18m -> 24m -> 30m`), lendo o `purchaseToken` via SQLite nativo em Rust (`rusqlite`), bloqueando etapas fora de ordem, exibindo lembretes claros de conferência de valor zero e detectando automaticamente a confirmação da Play Store.
4. **Checklist Final de Segurança:** Direciona o usuário ao final para desativar a renovação automática, mantendo todo o período acumulado ativo sem risco de cobrança futura.

---

## Estrutura Inicial do Repositório

```text
solari/
├── README.md                  # Visão geral e guia inicial do projeto
├── .gitignore                 # Arquivos ignorados pelo Git
├── docs/
│   ├── ARCHITECTURE.md        # Arquitetura 100% Rust + Tauri v2 + React/Tailwind
│   └── REFERENCE.md           # Referência técnica dos scripts legados e ajustes validados
└── reference/
    └── legacy-cli/            # Scripts originais de referência (apenas documentação histórica)
```

---

## Documentação

- [Arquitetura 100% Rust + Tauri v2](docs/ARCHITECTURE.md)
- [Referência do Sistema Legado](docs/REFERENCE.md)

---

## Próximos Passos (Roadmap)

- [ ] **Fase 1 — Ambiente de Build:** Instalar toolchain Rust (`rustup` + MSVC C++ Build Tools) e inicializar o scaffold **Tauri v2 + React/TypeScript + Tailwind CSS**.
- [ ] **Fase 2 — Core Engine em Rust (`src-tauri`):** Implementar módulos Rust para ADB (`tokio::process::Command`), download/extração automática (`reqwest`, `zip`, `xz2`), leitura SQLite do `library.db` (`rusqlite`) e execução de eventos via `adb shell` em tempo real.
- [ ] **Fase 3 — Interface Guiada (`src/`):** Construir as telas de Status do Emulador, Verificador de Ofertas, Stepper de Ativação (Passos 1 a 4) e Console de Logs recolhível.
- [ ] **Fase 4 — Build e Distribuição:** Gerar instalador nativo `.exe` / `.msi` leve (~5–8 MB) e 100% autônomo para Windows.
