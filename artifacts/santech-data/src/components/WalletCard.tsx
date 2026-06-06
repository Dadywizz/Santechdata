import { useGetWallet, getGetWalletQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Eye, EyeOff, Copy, CheckCircle2, Landmark, Loader2 } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export function WalletCard() {
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);
  const { data: wallet, isLoading } = useGetWallet({
    query: { queryKey: getGetWalletQueryKey() }
  });

  const virtualAccountNumber = (wallet as any)?.virtualAccountNumber ?? null;
  const virtualAccountBank = (wallet as any)?.virtualAccountBank ?? null;

  const handleCopy = () => {
    if (!virtualAccountNumber) return;
    navigator.clipboard.writeText(virtualAccountNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />

        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium mb-1">Available Balance</p>
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <Skeleton className="h-10 w-32 bg-primary-foreground/20" />
                ) : (
                  <h2 className="text-4xl font-bold tracking-tight">
                    {showBalance
                      ? `₦${(wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "••••••"}
                  </h2>
                )}
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Toggle balance visibility"
                >
                  {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="secondary" className="font-semibold px-6">
              <Link href="/fund-wallet">
                <CreditCard className="mr-2 h-4 w-4" />
                Fund Wallet
              </Link>
            </Button>
            <Button asChild variant="ghost" className="font-semibold text-primary-foreground hover:bg-white/10 hover:text-white border border-primary-foreground/20">
              <Link href="/transactions">History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dedicated Funding Account — always shown, reflects loading/empty/ready states */}
      <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={16} className="text-primary" />
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Auto Funding Account</p>
            <span className="ml-auto text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Auto-credited</span>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading account...</span>
            </div>
          ) : virtualAccountNumber ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono font-bold text-2xl tracking-widest text-foreground">{virtualAccountNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{virtualAccountBank} · No charge · Transfer any amount</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
              >
                {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Your dedicated account is being generated…</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
