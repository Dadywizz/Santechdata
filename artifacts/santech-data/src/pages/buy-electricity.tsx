import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetElectricityProviders, useVerifyMeter, usePurchaseElectricity } from "@workspace/api-client-react";
import { Zap, CheckCircle2 } from "lucide-react";
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
        setReceipt({
          reference: tx.reference,
          description: tx.description,
          amount: tx.amount,
          provider: (tx.metadata as any)?.provider,
          meterNumber: (tx.metadata as any)?.meterNumber,
          phone: (tx.metadata as any)?.phone,
          token: (tx.metadata as any)?.token,
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

      <div className="max-w-2xl space-y-6">
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
                      amount === a ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    ₦{a.toLocaleString()}
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

              {finalAmount >= 1000 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded-full">
                        <Zap size={22} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Token for {verified.name}</p>
                        <p className="font-bold text-lg">₦{finalAmount.toLocaleString()} worth of units</p>
                      </div>
                    </div>
                    <Button size="lg" onClick={handlePurchase} disabled={purchaseMutation.isPending}>
                      {purchaseMutation.isPending ? "Processing..." : "Buy Token"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} data={receipt} />
    </AppLayout>
  );
}
