import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const MESSAGES = [
  "Connecting to provider...",
  "Sending your order...",
  "Waiting for confirmation...",
  "Almost there...",
];

export function PurchasingOverlay({ open }: { open: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const msgIndex = Math.min(Math.floor(elapsed / 6), MESSAGES.length - 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card shadow-xl px-10 py-8 max-w-xs w-full mx-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center space-y-1">
          <p className="font-semibold text-base">Processing your order</p>
          <p className="text-sm text-muted-foreground">{MESSAGES[msgIndex]}</p>
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
