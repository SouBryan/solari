import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { EnvReport, OfferItem, SolariEvent, StepId } from "@/types/solari";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function checkEnvironment(): Promise<EnvReport> {
  if (!isTauriRuntime()) {
    throw new Error("Execução fora do runtime Tauri nativo.");
  }
  return invoke<EnvReport>("check_environment");
}

export async function listOffers(): Promise<OfferItem[]> {
  if (!isTauriRuntime()) {
    throw new Error("Execução fora do runtime Tauri nativo.");
  }
  return invoke<OfferItem[]>("list_offers");
}

export async function startStep(stepId: StepId): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("Execução fora do runtime Tauri nativo.");
  }
  return invoke<void>("start_step", { stepId });
}

export async function cancelActiveTask(): Promise<void> {
  if (!isTauriRuntime()) return;
  return invoke<void>("cancel_active_task");
}

export async function openSubscriptionsUrl(): Promise<void> {
  if (!isTauriRuntime()) {
    window.open("https://play.google.com/store/account/subscriptions", "_blank", "noopener,noreferrer");
    return;
  }
  return invoke<void>("open_subscriptions_url");
}

export async function onSolariEvent(
  handler: (event: SolariEvent) => void
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {};
  }
  return listen<SolariEvent>("solari://event", (e) => {
    handler(e.payload);
  });
}
