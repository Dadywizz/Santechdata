import { useState } from "react";
import { PurchasingOverlay } from "@/components/ui/purchasing-overlay";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useGetDataPlans, getGetDataPlansQueryKey, usePurchaseData, DataPlanNetwork, DataPlan } from "@workspace/api-client-react";
import { Check, Wifi, X, Wrench } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";
import { useAuth } from "@/contexts/AuthContext";

const NETWORKS = [
  { id: DataPlanNetwork.MTN, name: "MTN", color: "bg-[#FFCB00] text-black", border: "border-[#FFCB00]" },
  { id: DataPlanNetwork.AIRTEL, name: "Airtel", color: "bg-[#E40000] text-white", border: "border-[#E40000]" },
  { id: DataPlanNetwork.GLO, name: "Glo", color: "bg-[#008000] text-white", border: "border-[#008000]" },
  { id: DataPlanNetwork["9MOBILE"], name: "9Mobile", color: "bg-[#006633] text-white", border: "border-[#006633]" },
];

export default function BuyData() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isReseller = (user as any)?.role === "reseller";
  const planPrice = (plan: DataPlan) =>
    isReseller && (plan as any).resellerPrice != null
      ? (plan as any).resellerPrice as number
      : plan.price;

  const [network, setNetwork] = useState<DataPlanNetwork | null>(null);
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const { data: plans = [], isLoading: isLoadingPlans } = useGetDataPlans(
    { network: network || undefined },
    { query: { enabled: !!network, queryKey: getGetDataPlansQueryKey({ network: network || undefined }) } }
  );

  const purchaseMutation = usePurchaseData({
    mutation: {
      onSuccess: (tx: any) => {
        if (!tx || tx.status !== "success") {
          toast({
            title: tx?.status === "pending" ? "Purchase Processing" : "Purchase Submitted",
            description: tx?.message || "We're confirming this with the provider and will notify you shortly. Please don't retry yet — check your Transactions page for the result.",
            duration: 8000,
          });
          setPhone("");
          setSelectedPlan(null);
          return;
        }
        setReceipt({
          reference: tx.reference,
          description: tx.description,
          amount: tx.amount,
          network: (tx.metadata as any)?.network,
          phone: (tx.metadata as any)?.phone,
          size: (tx.metadata as any)?.size,
          validity: (tx.metadata as any)?.validity,
          createdAt: tx.createdAt,
          type: "data",
        });
        setPhone("");
        setSelectedPlan(null);
      },
      onError: (error: any) => {
        toast({
          title: "Purchase Failed",
          description: error.data?.error || "Could not complete purchase",
          variant: "destructive",
        });
      }
    }
  });

  const handlePurchase = () => {
    if (!selectedPlan) return;
    if (phone.length < 10) {
      toast({ title: "Invalid phone number", variant: "destructive" });
      return;
    }
    purchaseMutation.mutate({ data: { planId: selectedPlan.id, phone } });
  };

  const selectedNetwork = NETWORKS.find(n => n.id === network);

  return (
    <AppLayout>
      <PageHeader title="Buy Data" description="Instant data top-up for all networks" />

      {/* ── Maintenance banner ── */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3.5">
        <Wrench size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">Scheduled Maintenance in Progress</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
            Our data delivery service is currently undergoing maintenance to improve performance and reliability.
            Orders placed during this period may experience slight delays. We appreciate your patience and will restore full service shortly.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 pb-28">
        {/* Left column — network + phone */}
        <div className="md:col-span-1 space-y-6">
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Network</Label>
            <div className="grid grid-cols-2 gap-3">
              {NETWORKS.map(net => (
                <button
                  key={net.id}
                  onClick={() => { setNetwork(net.id); setSelectedPlan(null); }}
                  className={`relative overflow-hidden rounded-xl p-4 flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                    network === net.id
                      ? `${net.border} shadow-md`
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${net.color}`}>
                    {net.name[0]}
                  </div>
                  <span className="font-medium text-sm">{net.name}</span>
                  {network === net.id && (
                    <div className={`absolute top-2 right-2 ${net.color} w-5 h-5 rounded-full flex items-center justify-center`}>
                      <Check size={12} className={net.name === 'MTN' ? 'text-black' : 'text-white'} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Phone Number</Label>
            <Input
              type="tel"
              placeholder="e.g. 08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        {/* Right column — data plans */}
        <div className="md:col-span-2">
          <Label className="text-base font-semibold mb-3 block">Select Data Plan</Label>

          {!network ? (
            <div className="h-64 rounded-xl border border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
              <Wifi size={48} className="mb-4 opacity-20" />
              <p>Select a network to view available plans</p>
            </div>
          ) : isLoadingPlans ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1,2,3,4,5,6].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24 bg-muted/50 rounded-xl" />
                </Card>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border rounded-xl">
              No plans available for this network currently.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selectedPlan?.id === plan.id
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg">{plan.size}</span>
                    <div className="text-right">
                      <span className="font-bold text-primary">₦{planPrice(plan).toLocaleString()}</span>
                      {isReseller && (plan as any).resellerPrice != null && (
                        <p className="text-[10px] text-purple-500 font-semibold leading-none mt-0.5">Reseller</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{plan.validity}</span>
                    <span>{plan.name}</span>
                  </div>
                  {selectedPlan?.id === plan.id && (
                    <div className="mt-2 flex items-center gap-1 text-primary text-xs font-semibold">
                      <Check size={12} /> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky purchase bar — appears immediately when a plan is selected */}
      {selectedPlan && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t border-border shadow-2xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {selectedNetwork && (
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${selectedNetwork.color}`}>
                  {selectedNetwork.name[0]}
                </div>
              )}
              <div>
                <p className="font-bold text-base leading-tight">
                  {selectedPlan.size}
                  <span className="text-muted-foreground font-normal text-sm ml-2">{selectedPlan.validity}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {phone ? `→ ${phone}` : "Enter phone number above"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Clear selection"
              >
                <X size={18} />
              </button>
              <Button
                size="lg"
                onClick={handlePurchase}
                disabled={purchaseMutation.isPending || !phone || phone.length < 10}
                className="gap-2 px-6"
              >
                {purchaseMutation.isPending
                  ? "Processing..."
                  : `Pay ₦${planPrice(selectedPlan).toLocaleString()}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} data={receipt} />
      <PurchasingOverlay open={purchaseMutation.isPending} />
    </AppLayout>
  );
}
