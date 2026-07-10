import { useState } from "react";
import { PurchasingOverlay } from "@/components/ui/purchasing-overlay";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePurchaseAirtime } from "@workspace/api-client-react";
import { Check, X } from "lucide-react";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";

const NETWORKS = [
  { id: "MTN", name: "MTN", color: "bg-[#FFCB00] text-black", border: "border-[#FFCB00]" },
  { id: "AIRTEL", name: "Airtel", color: "bg-[#E40000] text-white", border: "border-[#E40000]" },
  { id: "GLO", name: "Glo", color: "bg-[#008000] text-white", border: "border-[#008000]" },
  { id: "9MOBILE", name: "9Mobile", color: "bg-[#006633] text-white", border: "border-[#006633]" },
];

const AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function BuyAirtime() {
  const { toast } = useToast();
  const [network, setNetwork] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const mutation = usePurchaseAirtime({
    mutation: {
      onSuccess: (tx: any) => {
        if (tx.status === "pending") {
          toast({
            title: "Purchase Processing",
            description: tx.message || "We're confirming this with the provider and will notify you shortly. Please don't retry yet.",
            duration: 8000,
          });
          setPhone("");
          setAmount(null);
          setCustomAmount("");
          return;
        }
        setReceipt({
          reference: tx.reference,
          description: tx.description,
          amount: tx.amount,
          network: (tx.metadata as any)?.network,
          phone: (tx.metadata as any)?.phone,
          createdAt: tx.createdAt,
          type: "airtime",
        });
        setPhone("");
        setAmount(null);
        setCustomAmount("");
      },
      onError: (error: any) => {
        toast({ title: "Purchase Failed", description: error.data?.error || "Could not complete purchase", variant: "destructive" });
      },
    },
  });

  const finalAmount = amount ?? (customAmount ? parseFloat(customAmount) : 0);
  const isReady = !!network && phone.length >= 10 && finalAmount >= 100;

  const handlePurchase = () => {
    if (!network) { toast({ title: "Select a network", variant: "destructive" }); return; }
    if (phone.length < 10) { toast({ title: "Invalid phone number", variant: "destructive" }); return; }
    if (!finalAmount || finalAmount < 100) { toast({ title: "Minimum airtime is ₦100", variant: "destructive" }); return; }
    mutation.mutate({ data: { network: network as any, phone, amount: finalAmount } });
  };

  const selectedNetwork = NETWORKS.find(n => n.id === network);

  return (
    <AppLayout>
      <PageHeader title="Buy Airtime" description="Instant airtime recharge for all networks" />

      <div className="grid gap-8 md:grid-cols-3 max-w-4xl pb-28">
        <div className="md:col-span-1 space-y-6">
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Network</Label>
            <div className="grid grid-cols-2 gap-3">
              {NETWORKS.map((net) => (
                <button
                  key={net.id}
                  onClick={() => setNetwork(net.id)}
                  className={`relative overflow-hidden rounded-xl p-4 flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                    network === net.id ? `${net.border} shadow-md` : "border-transparent bg-muted hover:bg-muted/80"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${net.color}`}>
                    {net.name[0]}
                  </div>
                  <span className="font-medium text-sm">{net.name}</span>
                  {network === net.id && (
                    <div className={`absolute top-2 right-2 ${net.color} w-5 h-5 rounded-full flex items-center justify-center`}>
                      <Check size={12} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Phone Number</Label>
            <Input type="tel" placeholder="e.g. 08012345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" />
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Amount</Label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustomAmount(""); }}
                  className={`rounded-xl p-3 border-2 font-semibold transition-all ${
                    amount === a ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  ₦{a.toLocaleString()}
                  {amount === a && <span className="block text-[10px] text-primary font-normal mt-0.5">Selected</span>}
                </button>
              ))}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Or enter custom amount</Label>
              <Input
                type="number"
                placeholder="Enter amount (min ₦100)"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }}
                className="h-12"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky purchase bar */}
      {finalAmount >= 100 && (
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
                  ₦{finalAmount.toLocaleString()} Airtime
                  {network && <span className="text-muted-foreground font-normal text-sm ml-2">· {network}</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {phone.length >= 10 ? `→ ${phone}` : "Enter phone number"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <button
                onClick={() => { setAmount(null); setCustomAmount(""); }}
                className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Clear amount"
              >
                <X size={18} />
              </button>
              <Button
                size="lg"
                onClick={handlePurchase}
                disabled={mutation.isPending || !isReady}
                className="gap-2 px-6"
              >
                {mutation.isPending ? "Processing..." : `Pay ₦${finalAmount.toLocaleString()}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} data={receipt} />
      <PurchasingOverlay open={mutation.isPending} />
    </AppLayout>
  );
}
