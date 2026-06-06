import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useGetCableProviders, useGetCablePlans, useVerifySmartcard, useSubscribeCable } from "@workspace/api-client-react";
import { Tv, CheckCircle2, X, Check } from "lucide-react";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";

type CableProvider = "DSTV" | "GOTV" | "STARTIMES";

export default function BuyCable() {
  const { toast } = useToast();
  const [provider, setProvider] = useState<CableProvider | "">("");
  const [smartcardNumber, setSmartcardNumber] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [verified, setVerified] = useState<{ name: string } | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const { data: providers = [] } = useGetCableProviders();
  const { data: plans = [] } = useGetCablePlans(
    provider ? { provider: provider as CableProvider } : undefined,
    { query: { enabled: !!provider, queryKey: [`/api/cable/plans`, provider] as const } }
  );

  const verifyMutation = useVerifySmartcard({
    mutation: {
      onSuccess: (data: any) => setVerified({ name: data.name }),
      onError: () => {
        toast({ title: "Smartcard not found", description: "Check the number and try again", variant: "destructive" });
        setVerified(null);
      },
    },
  });

  const subscribeMutation = useSubscribeCable({
    mutation: {
      onSuccess: (tx: any) => {
        setReceipt({
          reference: tx.reference,
          description: tx.description,
          amount: tx.amount,
          provider: (tx.metadata as any)?.provider,
          plan: (tx.metadata as any)?.plan,
          meterNumber: (tx.metadata as any)?.smartcardNumber,
          createdAt: tx.createdAt,
          type: "cable",
        });
        setSmartcardNumber(""); setPlanId(""); setVerified(null);
      },
      onError: (error: any) => {
        toast({ title: "Subscription Failed", description: error.data?.error || "Could not complete subscription", variant: "destructive" });
      },
    },
  });

  const selectedPlan = (plans as any[]).find((p: any) => p.id === planId);

  const handleVerify = () => {
    if (!provider) { toast({ title: "Select a provider", variant: "destructive" }); return; }
    if (!smartcardNumber) { toast({ title: "Enter smartcard number", variant: "destructive" }); return; }
    verifyMutation.mutate({ data: { provider: provider as CableProvider, smartcardNumber } });
  };

  const handleSubscribe = () => {
    if (!selectedPlan) { toast({ title: "Select a plan", variant: "destructive" }); return; }
    subscribeMutation.mutate({ data: { provider: provider as CableProvider, smartcardNumber, planId } });
  };

  return (
    <AppLayout>
      <PageHeader title="Cable TV" description="DStv, GOtv & Startimes subscription" />

      <div className="max-w-2xl space-y-6 pb-28">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="font-semibold mb-3 block">Select Provider</Label>
              <div className="grid grid-cols-3 gap-3">
                {(providers as any[]).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => { setProvider(p.id as CableProvider); setPlanId(""); setVerified(null); }}
                    className={`rounded-xl p-4 border-2 font-semibold text-sm transition-all ${
                      provider === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-semibold mb-2 block">Smartcard / IUC Number</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter smartcard number"
                  value={smartcardNumber}
                  onChange={(e) => { setSmartcardNumber(e.target.value); setVerified(null); }}
                  className="h-12 flex-1"
                />
                <Button variant="outline" onClick={handleVerify} disabled={verifyMutation.isPending} className="h-12 shrink-0">
                  {verifyMutation.isPending ? "..." : "Verify"}
                </Button>
              </div>
            </div>

            {verified && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="text-green-600 shrink-0" size={18} />
                <p className="font-semibold text-green-800 dark:text-green-200">{verified.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {verified && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Label className="font-semibold mb-3 block">Select Subscription Plan</Label>
              {(plans as any[]).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No plans available for this provider</p>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto pr-1">
                  {(plans as any[]).map((plan: any) => (
                    <button
                      key={plan.id}
                      onClick={() => setPlanId(plan.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        planId === plan.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">{plan.duration}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-lg">₦{plan.price?.toLocaleString()}</span>
                          {planId === plan.id && <Check size={16} className="text-primary" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky purchase bar */}
      {selectedPlan && verified && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t border-border shadow-2xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/10 text-purple-600 p-2.5 rounded-full shrink-0">
                <Tv size={20} />
              </div>
              <div>
                <p className="font-bold text-base leading-tight">{selectedPlan.name}</p>
                <p className="text-sm text-muted-foreground">{verified.name} · {provider}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <button
                onClick={() => setPlanId("")}
                className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Clear selection"
              >
                <X size={18} />
              </button>
              <Button
                size="lg"
                onClick={handleSubscribe}
                disabled={subscribeMutation.isPending}
                className="gap-2 px-6"
              >
                {subscribeMutation.isPending ? "Processing..." : `Pay ₦${selectedPlan.price?.toLocaleString()}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} data={receipt} />
    </AppLayout>
  );
}
