import { useState } from "react";
import { PurchasingOverlay } from "@/components/ui/purchasing-overlay";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetElectricityProviders, useVerifyMeter, usePurchaseElectricity } from "@workspace/api-client-react";
import { Zap, CheckCircle2, X } from "lucide-react";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";

const AMOUNTS = [1000, 2000, 3000, 5000, 10000, 20000];

export default function BuyElectricity() {
  const { toast } = useToast();
  const [providerCode, setProviderCode] = useState<string>("");
  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [verified, setVerified] = useState<{ name: string; address?: string } | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const { data: providers = [] } = useGetElectricityProviders();

  const verifyMutation = useVerifyMeter({
    mutation: {
      onSuccess: (data: any) => setVerified({ name: data.name, address: data.address }),
      onError: () => {
        toast({ title: "Meter not found", description: "Check the meter number and try again", variant: "destructive" });
        setVerified(null);
      },
    },
  });

  const purchaseMutation = usePurchaseElectricity({
    mutation: {
      onSuccess: (tx: any) => {
        if (!tx || tx.status !== "success") {
          toast({
            title: tx?.status === "pending" ? "Purchase Processing" : "Purchase Submitted",
            description: tx?.message || "We're confirming this with the provider and will notify you shortly. Please don't retry yet — check your Transactions page for the result.",
            duration: 8000,
          });
          setMeterNumber(""); setAmount(null); setCustomAmount(""); setVerified(null); setPhone("");
          return;
        }
        setReceipt({
          reference: tx.id,
          description: `Electricity token for meter ${tx.meterNumber}`,
          amount: tx.amount,
          meterNumber: tx.meterNumber,
          phone,
          token: tx.token,
          createdAt: tx.createdAt,
          type: "electricity",
        });
        setMeterNumber(""); setAmount(null); setCustomAmount(""); setVerified(null); setPhone("");
      },
      onError: (error: any) => {
        toast({ title: "Purchase Failed", description: error.data?.error || "Could not complete purchase", variant: "destructive" });
      },
    },
  });

  const finalAmount = amount ?? (customAmount ? parseFloat(customAmount) : 0);

  const handleVerify = () => {
    if (!providerCode) { toast({ title: "Select a provider", variant: "destructive" }); return; }
    if (!meterNumber) { toast({ title: "Enter meter number", variant: "destructive" }); return; }
    verifyMutation.mutate({ data: { providerCode, meterNumber, meterType } });
  };

  const handlePurchase = () => {
    if (!finalAmount || finalAmount < 1000) { toast({ title: "Minimum purchase is ₦1,000", variant: "destructive" }); return; }
    if (!phone || phone.length < 10) { toast({ title: "Enter a valid phone number for token delivery", variant: "destructive" }); return; }
    purchaseMutation.mutate({ data: { providerCode, meterNumber, meterType, amount: finalAmount, phone } });
  };

  return (
    <AppLayout>
      <PageHeader title="Buy Electricity" description="Instant electricity token purchase" />

      <div className="max-w-2xl space-y-6 pb-28">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="font-semibold mb-2 block">Electricity Provider</Label>
              <Select value={providerCode} onValueChange={(v) => { setProviderCode(v); setVerified(null); }}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {(providers as any[]).map((p: any) => (
                    <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold mb-2 block">Meter Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["prepaid", "postpaid"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => { setMeterType(type); setVerified(null); }}
                      className={`py-2 px-3 rounded-lg border-2 font-medium text-sm capitalize transition-all ${
                        meterType === type ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="font-semibold mb-2 block">Meter Number</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter meter number"
                    value={meterNumber}
                    onChange={(e) => { setMeterNumber(e.target.value); setVerified(null); }}
                    className="h-10 flex-1"
                  />
                  <Button variant="outline" onClick={handleVerify} disabled={verifyMutation.isPending} className="h-10 shrink-0">
                    {verifyMutation.isPending ? "..." : "Verify"}
                  </Button>
                </div>
              </div>
            </div>

            {verified && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="text-green-600 mt-0.5 shrink-0" size={18} />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">{verified.name}</p>
                  {verified.address && <p className="text-sm text-green-700 dark:text-green-300">{verified.address}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {verified && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="font-semibold mb-2 block">Phone Number (for token delivery)</Label>
                <Input type="tel" placeholder="e.g. 08012345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" />
              </div>

              <Label className="font-semibold mb-3 block">Select Amount</Label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setCustomAmount(""); }}
                    className={`rounded-xl p-3 border-2 font-semibold transition-all ${
                      amount === a
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    ₦{a.toLocaleString()}
                    {amount === a && <span className="block text-[10px] text-primary font-normal mt-0.5">Selected</span>}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                placeholder="Or enter custom amount (min ₦1,000)"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }}
                className="h-12"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky purchase bar */}
      {verified && finalAmount >= 1000 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t border-border shadow-2xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/10 text-yellow-600 p-2.5 rounded-full shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <p className="font-bold text-base leading-tight">₦{finalAmount.toLocaleString()} Units</p>
                <p className="text-sm text-muted-foreground">
                  {verified.name}
                  {phone.length >= 10 ? ` · ${phone}` : " · Enter phone above"}
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
                disabled={purchaseMutation.isPending || !phone || phone.length < 10}
                className="gap-2 px-6"
              >
                {purchaseMutation.isPending ? "Processing..." : "Buy Token"}
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
