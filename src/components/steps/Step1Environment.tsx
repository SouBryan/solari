import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Cpu,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CheckStatus, EnvCheckItem, EnvReport } from "@/types/solari";
import { cn } from "@/lib/utils";

interface Step1EnvironmentProps {
  checks: EnvCheckItem[];
  report: EnvReport | null;
  isChecking: boolean;
  errorMessage: string | null;
  onRunCheck: () => void;
  onNext: () => void;
}

const STATUS_META: Record<
  CheckStatus,
  { label: string; badgeVariant: "outline" | "default" | "success" | "warning" | "destructive" }
> = {
  pending: { label: "Aguardando", badgeVariant: "outline" },
  running: { label: "Verificando", badgeVariant: "default" },
  ok: { label: "Pronto", badgeVariant: "success" },
  warning: { label: "Atenção", badgeVariant: "warning" },
  error: { label: "Falha", badgeVariant: "destructive" },
};

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "ok":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-400" />;
    default:
      return <CircleDashed className="h-4 w-4 text-muted-foreground" />;
  }
}

export function Step1Environment({
  checks,
  report,
  isChecking,
  errorMessage,
  onRunCheck,
  onNext,
}: Step1EnvironmentProps) {
  const isReady = report?.ready === true;
  const completedCount = checks.filter((c) => c.status === "ok").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <CardTitle>Diagnóstico do Emulador</CardTitle>
          </div>
          <CardDescription>
            Verifica ADB, conexão com o emulador, acesso root, rede, Play Store, Google One e runner.
          </CardDescription>
        </div>

        <Button
          onClick={onRunCheck}
          disabled={isChecking}
          variant={isReady ? "outline" : "default"}
          className="shrink-0"
        >
          {isChecking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : report ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Verificar Novamente
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Executar Diagnóstico
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/50 px-3.5 py-2.5 text-xs">
          <span className="text-muted-foreground">
            Progresso da verificação:{" "}
            <strong className="text-foreground">
              {completedCount} de {checks.length}
            </strong>{" "}
            itens validados
          </span>
          {isReady ? (
            <Badge variant="success">Ambiente 100% pronto</Badge>
          ) : report && !report.ready ? (
            <Badge variant="destructive">Ambiente incompleto</Badge>
          ) : (
            <Badge variant="outline">Aguardando diagnóstico</Badge>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {checks.map((item, idx) => {
            const meta = STATUS_META[item.status];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.03 }}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition-colors",
                  item.status === "ok"
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : item.status === "error"
                    ? "border-red-500/30 bg-red-500/5"
                    : item.status === "running"
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/70 bg-background/40"
                )}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <StatusIcon status={item.status} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.label}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.detail ?? "Aguardando verificação..."}
                    </div>
                  </div>
                </div>
                <Badge variant={meta.badgeVariant} className="shrink-0 text-[10px]">
                  {meta.label}
                </Badge>
              </motion.div>
            );
          })}
        </div>

        {report && (report.serial || report.abi || report.adb_path) && (
          <div className="grid gap-2 rounded-lg border border-border/70 bg-secondary/30 p-3 text-xs sm:grid-cols-3">
            <div>
              <span className="text-muted-foreground">Dispositivo: </span>
              <span className="font-mono text-foreground">{report.serial ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Arquitetura ABI: </span>
              <span className="font-mono text-foreground">{report.abi ?? "—"}</span>
            </div>
            <div className="truncate" title={report.adb_path}>
              <span className="text-muted-foreground">ADB: </span>
              <span className="font-mono text-foreground">{report.adb_path ?? "—"}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            {errorMessage}
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {isReady
              ? "Tudo pronto! Avance para consultar as ofertas elegíveis da sua conta."
              : "Execute o diagnóstico e aguarde todos os itens ficarem prontos para avançar."}
          </p>
          <Button onClick={onNext} disabled={!isReady} className="shrink-0">
            Avançar para Ofertas
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
