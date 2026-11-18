import type { EnvCheckItem, EnvReport, OfferItem, SolariEvent, StepId } from "@/types/solari";

export const DEFAULT_ENV_CHECKS: EnvCheckItem[] = [
  { id: "adb", label: "ADB (Android Debug Bridge)", status: "pending" },
  { id: "emulator", label: "Emulador Android conectado", status: "pending" },
  { id: "root", label: "Acesso Root / Shell privilegiado", status: "pending" },
  { id: "network", label: "Conectividade de rede", status: "pending" },
  { id: "play_store", label: "Google Play Store instalada", status: "pending" },
  { id: "google_one", label: "Google One instalado", status: "pending" },
  { id: "runner", label: "Runner auxiliar no emulador", status: "pending" },
];

const PREVIEW_CHECK_DETAILS: Record<EnvCheckItem["id"], string> = {
  adb: "adb.exe pronto (1.0.41)",
  emulator: "MuMu Player 12 (127.0.0.1:7555)",
  root: "uid=0(root) verificado",
  network: "Latência OK para Google Play",
  play_store: "com.android.vending v44.2.19",
  google_one: "com.google.android.apps.subscriptions.red",
  runner: "Binário x86_64 sincronizado",
};

const PREVIEW_OFFERS: OfferItem[] = [
  {
    product: "google_one_ai_pro_5tb",
    offer_id: "12months-eft",
    micros: "0",
    period: "P1Y",
    token: "eft-12m",
    title: "Google AI Pro (5 TB) — 12 meses",
    name: "Teste gratuito inicial de 12 meses",
    months: 12,
    is_free: true,
  },
  {
    product: "google_one_ai_pro_5tb",
    offer_id: "6months-eft",
    micros: "0",
    period: "P6M",
    token: "eft-6m-1",
    title: "Extensão Google AI Pro — +6 meses",
    name: "Oferta promocional de extensão (+6 meses)",
    months: 6,
    is_free: true,
  },
  {
    product: "google_one_ai_pro_5tb",
    offer_id: "6months-eft-2",
    micros: "0",
    period: "P6M",
    token: "eft-6m-2",
    title: "Segunda Extensão Google AI Pro — +6 meses",
    name: "Oferta promocional secundária (+6 meses)",
    months: 6,
    is_free: true,
  },
  {
    product: "google_one_ai_pro_5tb",
    offer_id: "6months-eft-ss-2026",
    micros: "0",
    period: "P6M",
    token: "eft-6m-ss",
    title: "Extensão Extra ss-2026 — +6 meses",
    name: "Bônus elegível para completar 30 meses",
    months: 6,
    is_free: true,
  },
];

function nowTime(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour12: false });
}

export interface PreviewController {
  checkEnvironment: () => Promise<EnvReport>;
  listOffers: () => Promise<OfferItem[]>;
  startStep: (stepId: StepId) => Promise<void>;
  cancelActiveTask: () => Promise<void>;
}

/**
 * Simulador leve para testar todo o fluxo do wizard no navegador
 * quando o backend Tauri/Rust não está ativo.
 */
export function createPreviewController(emit: (event: SolariEvent) => void): PreviewController {
  let cancelled = false;
  let activeTimers: number[] = [];

  const clearTimers = () => {
    for (const id of activeTimers) {
      window.clearTimeout(id);
    }
    activeTimers = [];
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      const id = window.setTimeout(() => {
        if (cancelled) {
          reject(new Error("PREVIEW_CANCELLED"));
          return;
        }
        resolve();
      }, ms);
      activeTimers.push(id);
    });

  const log = (level: "info" | "warn" | "error" | "ok", message: string) => {
    emit({ type: "log", level, message, timestamp: nowTime() });
  };

  return {
    async checkEnvironment(): Promise<EnvReport> {
      cancelled = false;
      clearTimers();
      log("info", "[Preview] Iniciando diagnóstico simulado do ambiente...");

      const checks: EnvCheckItem[] = [];
      for (const base of DEFAULT_ENV_CHECKS) {
        if (cancelled) break;
        const runningItem: EnvCheckItem = {
          ...base,
          status: "running",
          detail: "Verificando...",
        };
        emit({ type: "env_progress", item: runningItem });
        await wait(240);

        const okItem: EnvCheckItem = {
          ...base,
          status: "ok",
          detail: PREVIEW_CHECK_DETAILS[base.id],
        };
        checks.push(okItem);
        emit({ type: "env_progress", item: okItem });
        log("ok", `[Preview] ${base.label}: ${okItem.detail}`);
      }

      log("ok", "[Preview] Ambiente validado com sucesso. Pronto para consultar ofertas.");
      return {
        ready: true,
        adb_path: "C:\\Solari\\bin\\adb.exe",
        serial: "127.0.0.1:7555",
        abi: "x86_64",
        checks,
      };
    },

    async listOffers(): Promise<OfferItem[]> {
      cancelled = false;
      clearTimers();
      log("info", "[Preview] Consultando ofertas elegíveis na conta Google Play (sem risco)...");

      for (const offer of PREVIEW_OFFERS) {
        await wait(220);
        emit({ type: "offer", offer });
        log("info", `[Preview] Oferta encontrada: ${offer.offer_id} (${offer.months} meses, gratuito)`);
      }

      log("ok", "[Preview] 4 ofertas gratuitas detectadas (total acumulável: 30 meses).");
      return PREVIEW_OFFERS;
    },

    async startStep(stepId: StepId): Promise<void> {
      cancelled = false;
      clearTimers();
      log("info", `[Preview] Iniciando etapa '${stepId}' no emulador...`);

      await wait(450);
      emit({
        type: "launched",
        step_id: stepId,
        code: 0,
        msg: "Checkout da Play Store aberto no emulador. Confira R$ 0,00 hoje.",
      });
      log("warn", `[Preview] Confira 'R$ 0,00 hoje' no checkout antes de confirmar (${stepId}).`);

      await wait(1400);
      emit({
        type: "purchase_cb",
        step_id: stepId,
        code: 0,
        msg: "Assinatura confirmada com sucesso (code = 0).",
      });
      emit({
        type: "step_done",
        step_id: stepId,
        success: true,
        message: `Etapa ${stepId} concluída.`,
      });
      log("ok", `[Preview] Etapa '${stepId}' concluída e token atualizado.`);
    },

    async cancelActiveTask(): Promise<void> {
      cancelled = true;
      clearTimers();
      emit({ type: "cancelled" });
      log("warn", "[Preview] Tarefa ativa cancelada pelo usuário.");
    },
  };
}
