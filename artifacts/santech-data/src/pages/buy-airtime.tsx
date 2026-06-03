import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePurchaseAirtime } from "@workspace/api-client-react";
import { Check, Phone } from "lucide-react";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";

const NETWORKS = [
  { id: "MTN", name: "MTN", color: "bg-[#FFCB00] text-black", border: "border-[#FFCB00]" },
  { id: "AIRTEL", name: "Airtel", color: "bg-[#E40000] text-white", border: "border-[#E40000]" },
  { id: "GLO", name: "Glo", color: "bg-[#008000] text-white", border: "border-[#008000]" },
  { id: "9MOBILE", name: "9Mobile", color: "bg-[#006633] text-white", border: "border-[#006633]" },
];

const AMOUNTS = [50, 100, 200, 500, 1000, 2000];

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

  const handlePurchase = () => {
    if (!network) { toast({ title: "Select a network", variant: "destructive" }); return; }
    if (phone.length < 10) { toast({ title: "Invalid phone number", variant: "destructive" }); return; }
    if (!finalAmount || finalAmount < 50) { toast({ title: "Minimum airtime is ₦50", variant: "destructive" }); return; }
    mutation.mutate({ data: { network: network as any, phone, amount: finalAmount } });
  };

  return (
    <AppLayout>
      <PageHeader title="Buy Airtime" description="Instant airtime recharge for all networks" />

      <div className="grid gap-8 md:grid-cols-3 max-w-4xl">
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
                    amount === a ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  ₦{a.toLocaleString()}
                </button>
              ))}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Or enter custom amount</Label>
              <Input
                type="number"
                placeholder="Enter amount (min ₦50)"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }}
                className="h-12"
              />
            </div>
          </div>

          {(amount || parseFloat(customAmount) > 0) && phone && network && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary p-3 rounded-full">
                    <Phone size={22} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sending airtime to</p>
                    <p className="font-bold text-lg">{phone} • {network}</p>
                  </div>
                </div>
                <Button size="lg" onClick={handlePurchase} disabled={mutation.isPending} className="w-full sm:w-auto">
                  {mutation.isPending ? "Processing..." : `Pay ₦${finalAmount.toLocaleString()}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} data={receipt} />
    </AppLayout>
  );
}
