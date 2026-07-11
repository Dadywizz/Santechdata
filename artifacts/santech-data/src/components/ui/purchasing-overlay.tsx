import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const STAGES: Array<{ after: number; message: string }> = [
  { after: 0,  message: "Connecting to provider..." },
  { after: 6,  message: "Sending your order..." },
  { after: 12, message: "Waiting for confirmation..." },
  { after: 25, message: "Provider is processing — please hold on..." },
  { after: 40, message: "Still working on it — almost there..." },
  { after: 60, message: "This is taking a little longer than usual. Please don't close this page..." },
  { after: 75, message: "Nearly done — thank you for your patience..." },
];

export function PurchasingOverlay({ open }: { open: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const stage = [...STAGES].reverse().find(s => elapsed >= s.after) ?? STAGES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card shadow-xl px-10 py-8 max-w-xs w-full mx-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center space-y-1">
          <p className="font-semibold text-base">Processing your order</p>
          <p className="text-sm text-muted-foreground">{stage.message}</p>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {elapsed}s elapsed
        </div>
        <p className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium">
          Please do not close or refresh this page
        </p>
      </div>
    </div>
  );
}
