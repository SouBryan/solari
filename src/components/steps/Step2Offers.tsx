import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gift,
  Loader2,
  SearchCheck,
  Shield,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { OfferItem } from "@/types/solari";
import { cn } from "@/lib/utils";

interface Step2OffersProps {
  offers: OfferItem[];
  hasChecked: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  onCheckOffers: () => void;
  onBack: () => void;
  onNext: () => void;
}

function formatPrice(offer: OfferItem): string {
  if (offer.is_free || offer.micros === "0") {
    return "Gratuito (R$ 0,00)";
  }
  const microsNum = Number(offer.micros);
  if (!Number.isFinite(microsNum) || microsNum <= 0) {
    return offer.micros;
  }
  return (microsNum / 1_000_000).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function Step2Offers({
  offers,
  hasChecked,
  isLoading,
  errorMessage,
  onCheckOffers,
  onBack,
  onNext,
}: Step2OffersProps) {
  const freeOffers = offers.filter((o) => o.is_free || o.micros === "0");
  const rawFreeMonths = freeOffers.reduce((acc, o) => acc + Math.max(0, o.months), 0);
  const accumulableMonths = Math.min(30, rawFreeMonths);
  const progressPct = Math.round((accumulableMonths / 30) * 100);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <CardTitle>Consulta de Ofertas da Conta</CardTitle>
          </div>
          <CardDescription>
            Consulta somente leitura na Google Play Store para identificar ofertas elegíveis sem iniciar cobrança.
          </CardDescription>
        </div>

        <Button onClick={onCheckOffers} disabled={isLoading} className="shrink-0">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Consultando...
            </>
          ) : (
            <>
              <SearchCheck className="h-4 w-4" />
              Verificar Ofertas da Conta (Sem Risco)
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4 text-primary" />
              <span>Total acumulável estimado (limite de 30 meses)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                {accumulableMonths} {accumulableMonths === 1 ? "mês" : "meses"}
              </span>
              <Badge variant="outline" className="text-[11px]">
                máx. 30m
              </Badge>
            </div>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            Esta verificação apenas lê os dados de elegibilidade da conta logada no emulador.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            {errorMessage}
          </div>
        )}

        {offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/40 px-6 py-10 text-center">
            <Gift className="mb-2 h-8 w-8 text-muted-foreground/70" />
            <p className="text-sm font-medium">
              {isLoading
                ? "Buscando ofertas disponíveis na Google Play..."
                : hasChecked
                ? "Nenhuma oferta gratuita encontrada para esta conta."
                : "Nenhuma oferta consultada ainda."}
            </p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Clique em &ldquo;Verificar Ofertas da Conta (Sem Risco)&rdquo; para listar as promoções liberadas.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {offers.map((offer, idx) => {
              const isFree = offer.is_free || offer.micros === "0";
              return (
                <motion.div
                  key={`${offer.product}-${offer.offer_id}-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className={cn(
                    "flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors",
                    isFree
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/80 bg-background/50"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">
                          {offer.title || offer.name || offer.offer_id}
                        </h4>
                        <p className="truncate text-xs text-muted-foreground">
                          {offer.name || offer.product}
                        </p>
                      </div>
                      <Badge variant={isFree ? "success" : "secondary"} className="shrink-0">
                        {isFree ? "Gratuito" : formatPrice(offer)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-secondary/40 px-2 py-0.5 font-mono text-[11px]">
                        <Tag className="h-3 w-3 text-primary" />
                        {offer.offer_id}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-secondary/40 px-2 py-0.5 text-[11px]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        {offer.months} {offer.months === 1 ? "mês" : "meses"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                    <span>Valor: {formatPrice(offer)}</span>
                    <span className="font-mono">Período: {offer.period || `${offer.months}M`}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={onNext} disabled={offers.length === 0 && !hasChecked}>
            Iniciar Acumulação
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
