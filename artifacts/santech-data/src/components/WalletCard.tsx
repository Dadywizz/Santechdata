import { useGetWallet, getGetWalletQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Eye, EyeOff, Landmark, Copy, CheckCircle2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export function WalletCard() {
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);
  const { data: wallet, isLoading } = useGetWallet({
    query: { queryKey: getGetWalletQueryKey() }
  });

  const hasVA = !!wallet?.virtualAccountNumber;

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet!.virtualAccountNumber!).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />

      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
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

        {/* Show bank account if already set up */}
        {!isLoading && hasVA && (
          <div className="mb-4 p-3 rounded-xl bg-white/10 border border-white/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Landmark size={14} className="text-primary-foreground/70 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-primary-foreground/60 uppercase tracking-wide font-semibold">Your Dedicated Account</p>
                  <p className="font-mono font-bold text-base tracking-widest">{wallet!.virtualAccountNumber}</p>
                  <p className="text-xs text-primary-foreground/70">{wallet!.virtualAccountBank}</p>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                title="Copy account number"
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Prompt to set up bank account if not yet done */}
        {!isLoading && !hasVA && (
          <Link href="/fund-wallet">
            <div className="mb-4 p-3 rounded-xl bg-white/15 border border-white/30 cursor-pointer hover:bg-white/20 transition-colors flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Landmark size={16} className="text-primary-foreground/80 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Get your free bank account</p>
                  <p className="text-xs text-primary-foreground/70">Link BVN or NIN — fund via transfer anytime</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-primary-foreground/70 shrink-0" />
            </div>
          </Link>
        )}

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
  );
}
