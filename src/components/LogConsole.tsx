import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Terminal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface LogEntry {
  id: number;
  level: "info" | "warn" | "error" | "ok";
  message: string;
  timestamp: string;
}

interface LogConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
}

const LEVEL_STYLES: Record<LogEntry["level"], { label: string; className: string }> = {
  info: { label: "INFO", className: "border-sky-500/30 bg-sky-500/10 text-sky-400" },
  ok: { label: "OK", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  warn: { label: "AVISO", className: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  error: { label: "ERRO", className: "border-red-500/30 bg-red-500/10 text-red-400" },
};

export function LogConsole({ logs, onClear }: LogConsoleProps) {
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length, open]);

  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/80 bg-card/80 backdrop-blur"
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex flex-1 items-center gap-2.5 text-left text-xs font-medium text-foreground hover:text-primary transition-colors"
          >
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span>Console de Logs em Tempo Real</span>
            <Badge variant="outline" className="text-[11px]">
              {logs.length} {logs.length === 1 ? "registro" : "registros"}
            </Badge>
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-[11px]">
                {errorCount} {errorCount === 1 ? "erro" : "erros"}
              </Badge>
            )}
            <span className="ml-auto text-muted-foreground">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </span>
          </button>
        </CollapsibleTrigger>

        {logs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="ml-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Limpar logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        )}
      </div>

      <CollapsibleContent className="border-t border-border/60">
        <ScrollArea className="h-48 w-full px-4 py-3">
          {logs.length === 0 ? (
            <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
              Nenhum evento registrado ainda. Execute uma ação para acompanhar os logs aqui.
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-xs">
              {logs.map((entry) => {
                const style = LEVEL_STYLES[entry.level];
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-secondary/40"
                  >
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {entry.timestamp}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded border px-1.5 py-0.2 text-[10px] font-semibold",
                        style.className
                      )}
                    >
                      {style.label}
                    </span>
                    <span className="break-all text-foreground/90">{entry.message}</span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}
