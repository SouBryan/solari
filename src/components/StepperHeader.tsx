import { motion } from "motion/react";
import { Check, Cpu, Eye, Layers, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type WizardStep = 1 | 2 | 3 | 4;

interface StepMeta {
  step: WizardStep;
  title: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const WIZARD_STEPS: StepMeta[] = [
  { step: 1, title: "Diagnóstico do Emulador", shortLabel: "Diagnóstico", icon: Cpu },
  { step: 2, title: "Consulta de Ofertas", shortLabel: "Ofertas", icon: Search },
  { step: 3, title: "Assistente de Acumulação", shortLabel: "Acumulação", icon: Layers },
  { step: 4, title: "Finalização Segura", shortLabel: "Finalização", icon: ShieldCheck },
];

interface StepperHeaderProps {
  currentStep: WizardStep;
  maxUnlockedStep: WizardStep;
  completedWizardSteps: Record<WizardStep, boolean>;
  onSelectStep: (step: WizardStep) => void;
  isTauri: boolean;
  previewEnabled: boolean;
  onTogglePreview: () => void;
}

export function StepperHeader({
  currentStep,
  maxUnlockedStep,
  completedWizardSteps,
  onSelectStep,
  isTauri,
  previewEnabled,
  onTogglePreview,
}: StepperHeaderProps) {
  const progressValue = ((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100;

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Solari</h1>
              <Badge variant="outline" className="text-[11px] font-normal">
                Google AI Pro · 5 TB
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Assistente guiado para verificação e acúmulo seguro de assinatura
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isTauri && (
            <button
              type="button"
              onClick={onTogglePreview}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                previewEnabled
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/20"
                  : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
              title="Alternar simulação de backend no navegador"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Modo Preview: {previewEnabled ? "Ativo" : "Desativado"}</span>
            </button>
          )}
          <Badge variant="secondary" className="px-3 py-1">
            Etapa {currentStep} de 4
          </Badge>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card/70 p-3.5 backdrop-blur">
        <Progress value={progressValue} className="mb-3 h-1.5" />
        <nav aria-label="Etapas do assistente" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WIZARD_STEPS.map(({ step, shortLabel, icon: Icon }) => {
            const isActive = currentStep === step;
            const isDone = completedWizardSteps[step];
            const isAccessible = step <= maxUnlockedStep || (previewEnabled && !isTauri);

            return (
              <button
                key={step}
                type="button"
                disabled={!isAccessible}
                onClick={() => isAccessible && onSelectStep(step)}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all",
                  isActive
                    ? "border-primary/60 bg-primary/10 text-foreground shadow-sm"
                    : isDone
                    ? "border-emerald-500/30 bg-emerald-500/5 text-foreground hover:bg-emerald-500/10"
                    : isAccessible
                    ? "border-border/60 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground"
                    : "cursor-not-allowed border-border/40 bg-background/20 text-muted-foreground/50 opacity-60"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-step-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-lg border border-primary/50 pointer-events-none"
                  />
                )}
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                    isDone
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Etapa {step}
                  </div>
                  <div className="truncate text-xs font-medium">{shortLabel}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
