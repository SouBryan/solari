import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers,
  Loader2,
  Lock,
  Play,
  Square,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ACCUMULATION_STEPS, type StepId } from "@/types/solari";
import { cn } from "@/lib/utils";

interface Step3AccumulationProps {
  completedSubSteps: StepId[];
  activeStepId: StepId | null;
  statusMessage: string | null;
  errorMessage: string | null;
  onStartStep: (stepId: StepId) => void;
  onCancelTask: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step3Accumulation({
  completedSubSteps,
  activeStepId,
  statusMessage,
  errorMessage,
  onStartStep,
  onCancelTask,
  onBack,
  onNext,
}: Step3AccumulationProps) {
  const accumulatedMonths = ACCUMULATION_STEPS.reduce(
    (sum, s) => (completedSubSteps.includes(s.id) ? sum + s.months : sum),
    0
  );
  const nextPendingStep = ACCUMULATION_STEPS.find((s) => !completedSubSteps.includes(s.id));
  const allCompleted = completedSubSteps.length === ACCUMULATION_STEPS.length;
  const canFinish = completedSubSteps.length > 0 && activeStepId === null;
  const progressPct = Math.round((accumulatedMonths / 30) * 100);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <CardTitle>Assistente de Acumulação (Passos 1 a 4)</CardTitle>
          </div>
          <CardDescription>
            Execute os passos em ordem sequencial. Ao abrir o checkout no emulador, confira R$ 0,00, conclua na Play Store e avance para o próximo passo.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="default" className="px-3 py-1 text-xs">
            Acumulado: {accumulatedMonths} / 30 meses
          </Badge>
          {activeStepId && (
            <Button variant="destructive" size="sm" onClick={onCancelTask}>
              <Square className="h-3.5 w-3.5" />
              Cancelar Tarefa
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Aviso destacado de segurança */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-0.5 text-xs leading-relaxed">
            <p className="font-semibold text-amber-300">
              Atenção antes de confirmar no emulador:
            </p>
            <p>
              Sempre confira na tela de checkout da Google Play se o valor exibido é{" "}
              <strong className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-100">
                R$ 0,00 hoje
              </strong>{" "}
              antes de tocar em Assinar/Confirmar. Se aparecer qualquer cobrança imediata, cancele no emulador e clique em{" "}
              <strong>Cancelar Tarefa</strong>.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso da acumulação</span>
            <span className="font-medium text-foreground">{progressPct}% (até 30 meses)</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-200">
            {activeStepId && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-sky-400" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Linha do tempo sequencial */}
        <div className="relative space-y-3 pl-2">
          {ACCUMULATION_STEPS.map((stepDef, index) => {
            const isCompleted = completedSubSteps.includes(stepDef.id);
            const isRunning = activeStepId === stepDef.id;
            const isNext = nextPendingStep?.id === stepDef.id;
            const isLocked = !isCompleted && !isNext;
            const canStart = isNext && activeStepId === null;

            return (
              <motion.div
                key={stepDef.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className={cn(
                  "relative flex flex-col justify-between gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center",
                  isCompleted
                    ? "border-emerald-500/35 bg-emerald-500/5"
                    : isRunning
                    ? "border-primary/60 bg-primary/10 shadow-sm"
                    : isNext
                    ? "border-primary/40 bg-card"
                    : "border-border/50 bg-background/40 opacity-65"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                      isCompleted
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                        : isRunning
                        ? "border-primary bg-primary text-primary-foreground"
                        : isNext
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border bg-secondary text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isLocked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      stepDef.order
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">{stepDef.title}</h4>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {stepDef.offerId}
                      </Badge>
                      {stepDef.requiresToken && (
                        <Badge variant="secondary" className="text-[10px]">
                          Requer token anterior
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{stepDef.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  {isCompleted ? (
                    <Badge variant="success" className="px-3 py-1">
                      Concluído (+{stepDef.months}m)
                    </Badge>
                  ) : isRunning ? (
                    <Badge variant="default" className="px-3 py-1">
                      Aguardando checkout...
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!canStart}
                      onClick={() => onStartStep(stepDef.id)}
                      variant={isNext ? "default" : "outline"}
                    >
                      {isLocked ? (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Bloqueado
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Executar Passo {stepDef.order}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack} disabled={activeStepId !== null}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button
            onClick={onNext}
            disabled={!canFinish}
            variant={allCompleted ? "default" : "secondary"}
          >
            {allCompleted ? "Ir para Finalização Segura" : "Finalizar com Período Atual"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
