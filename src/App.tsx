import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function App() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Solari</h1>
            <p className="text-xs text-muted-foreground">Assistente Google AI Pro (5 TB)</p>
          </div>
          <Badge>Etapa {step} de 4</Badge>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Base do Sistema Inicializada</CardTitle>
                <CardDescription>
                  Pronto para especialização em Frontend e Backend via worktrees.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))}>
                  Anterior
                </Button>
                <Button onClick={() => setStep((s) => Math.min(4, s + 1))}>Próximo</Button>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
