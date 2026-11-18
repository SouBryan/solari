import { motion } from "motion/react";
import {
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ACCUMULATION_STEPS, type StepId } from "@/types/solari";

interface Step4FinishProps {
  completedSubSteps: StepId[];
  onOpenSubscriptions: () => void;
  onBack: () => void;
  onReset: () => void;
}

export function Step4Finish({
  completedSubSteps,
  onOpenSubscriptions,
  onBack,
  onReset,
}: Step4FinishProps) {
  const completedDefs = ACCUMULATION_STEPS.filter((s) => completedSubSteps.includes(s.id));
  const totalMonths = completedDefs.reduce((sum, s) => sum + s.months, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <CardTitle>Finalização Segura</CardTitle>
        </div>
        <CardDescription>
          Confira o resumo do período acumulado e desative a renovação automática na Google Play.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center justify-between gap-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-5 sm:flex-row"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CalendarCheck2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-300/80">
                Período total acumulado
              </div>
              <div className="text-2xl font-bold text-foreground">
                {totalMonths} {totalMonths === 1 ? "mês" : "meses"} de Google AI Pro
              </div>
              <div className="text-xs text-muted-foreground">
                {completedDefs.length} de {ACCUMULATION_STEPS.length} etapas de acumulação concluídas
              </div>
            </div>
          </div>

          <Badge variant="success" className="px-3 py-1 text-xs">
            Pronto para proteger conta
          </Badge>
        </motion.div>

        {completedDefs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Etapas concluídas nesta sessão
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {completedDefs.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="truncate font-medium">{step.title}</span>
                  </div>
                  <Badge variant="outline" className="ml-2 shrink-0 font-mono text-[10px]">
                    +{step.months}m
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Destaque para cancelamento de renovação automática */}
        <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1 text-xs leading-relaxed">
              <p className="text-sm font-semibold text-foreground">
                Passo obrigatório de segurança: Cancelar renovação automática
              </p>
              <p className="text-muted-foreground">
                Ao cancelar a assinatura na página da Google Play,{" "}
                <strong className="text-foreground">
                  você mantém todo o período acumulado ({totalMonths} meses) ativo até a data de expiração
                </strong>
                , garantindo que não haverá cobrança automática futura.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button size="lg" onClick={onOpenSubscriptions} className="w-full sm:w-auto">
              <ExternalLink className="h-4 w-4" />
              Abrir Assinaturas da Google Play
            </Button>
            <span className="text-[11px] text-muted-foreground">
              play.google.com/store/account/subscriptions
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Voltar para Acumulação
          </Button>
          <Button variant="ghost" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reiniciar Assistente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
