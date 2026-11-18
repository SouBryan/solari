export type StepId = "pro12" | "pro6" | "pro6b" | "pro6c";

export type CheckStatus = "pending" | "running" | "ok" | "warning" | "error";

export interface EnvCheckItem {
  id:
    | "adb"
    | "emulator"
    | "root"
    | "network"
    | "play_store"
    | "google_one"
    | "runner";
  label: string;
  status: CheckStatus;
  detail?: string;
}

export interface EnvReport {
  ready: boolean;
  adb_path?: string;
  serial?: string;
  abi?: string;
  checks: EnvCheckItem[];
}

export interface OfferItem {
  product: string;
  offer_id: string;
  micros: string;
  period: string;
  token: string;
  title: string;
  name: string;
  months: number;
  is_free: boolean;
}

export interface AccumulationStepDef {
  id: StepId;
  order: number;
  title: string;
  subtitle: string;
  offerId: string;
  months: number;
  requiresToken: boolean;
}

export const ACCUMULATION_STEPS: AccumulationStepDef[] = [
  {
    id: "pro12",
    order: 1,
    title: "Passo 1 — Ativação Inicial (12 meses)",
    subtitle: "Assinatura base de 12 meses gratuitos sem token anterior",
    offerId: "12months-eft",
    months: 12,
    requiresToken: false,
  },
  {
    id: "pro6",
    order: 2,
    title: "Passo 2 — Soma +6 meses (18m total)",
    subtitle: "Upgrade usando purchaseToken vigente + CHARGE_FULL_PRICE (mode 5)",
    offerId: "6months-eft",
    months: 6,
    requiresToken: true,
  },
  {
    id: "pro6b",
    order: 3,
    title: "Passo 3 — Soma +6 meses (24m total)",
    subtitle: "Segunda extensão de 6 meses via proration mode 5",
    offerId: "6months-eft-2",
    months: 6,
    requiresToken: true,
  },
  {
    id: "pro6c",
    order: 4,
    title: "Passo 4 — Soma Extra +6 meses (30m total)",
    subtitle: "Extensão opcional ss-2026 para atingir até 30 meses",
    offerId: "6months-eft-ss-2026",
    months: 6,
    requiresToken: true,
  },
];

export type SolariEvent =
  | { type: "log"; level: "info" | "warn" | "error" | "ok"; message: string; timestamp: string }
  | { type: "env_progress"; item: EnvCheckItem }
  | { type: "offer"; offer: OfferItem }
  | { type: "chosen"; product: string; offer_id: string; period: string }
  | { type: "launched"; step_id: StepId; code: number; msg: string }
  | { type: "purchase_cb"; step_id: StepId; code: number; msg: string }
  | { type: "step_done"; step_id: StepId; success: boolean; message: string }
  | { type: "error"; message: string }
  | { type: "cancelled" };
