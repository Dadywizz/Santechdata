import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useInitiateFunding, useWalletTransfer } from "@workspace/api-client-react";
import { CreditCard, ArrowRightLeft, ExternalLink } from "lucide-react";

const PROVIDERS = [
  { id: "flutterwave", name: "Flutterwave", desc: "Cards, Mobile Money, Bank Transfer", active: true },
  { id: "monnify", name: "Monnify", desc: "Bank Transfer, Cards, USSD", active: true },
  { id: "paystack", name: "Paystack", desc: "Cards, Bank Transfer, USSD", active: true },
];

const AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

type Tab = "fund" | "transfer";

export default function FundWallet() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("fund");
  const [provider, setProvider] = useState("flutterwave");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [transferPhone, setTransferPhone] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const fundMutation = useInitiateFunding({
    mutation: {
      onSuccess: (data: any) => {
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        }
      },
      onError: (error: any) => {
        toast({ title: "Failed to initiate payment", description: error.data?.error || "Please try again", variant: "destructive" });
      },
    },
  });

  const transferMutation = useWalletTransfer({
    mutation: {
      onSuccess: () => {
        toast({ title: "Transfer Successful!", description: `₦${transferAmount} sent to ${transferPhone}` });
        setTransferPhone(""); setTransferAmount(""); setTransferNote("");
      },
      onError: (error: any) => {
        toast({ title: "Transfer Failed", description: error.data?.error || "Could not complete transfer", variant: "destructive" });
      },
    },
  });

  const finalAmount = amount ?? (customAmount ? parseFloat(customAmount) : 0);

  const handleFund = () => {
    if (!finalAmount || finalAmount < 100) { toast({ title: "Minimum funding is ₦100", variant: "destructive" }); return; }
    fundMutation.mutate({ data: { amount: finalAmount, gateway: provider as any } });
  };

  const handleTransfer = () => {
    if (!transferPhone || !transferAmount) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    transferMutation.mutate({ data: { recipientPhone: transferPhone, amount: parseFloat(transferAmount), note: transferNote } });
  };

  return (
    <AppLayout>
      <PageHeader title="Fund Wallet" description="Add money to your SanTech wallet" />

      <div className="max-w-2xl">
        <div className="flex gap-2 mb-6 bg-muted p-1 rounded-xl w-fit">
          {(["fund", "transfer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
                tab === t ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              {t === "fund" ? "Add Money" : "Transfer"}
            </button>
          ))}
        </div>

        {tab === "fund" && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="font-semibold mb-3 block">Payment Method</Label>
                <div className="grid gap-3">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => p.active && setProvider(p.id)}
                      disabled={!p.active}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        !p.active
                          ? "border-border opacity-40 cursor-not-allowed"
                          : provider === p.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-xs ${
                        provider === p.id ? "bg-primary/10 text-primary" : ""
                      }`}>
                        {p.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-sm text-muted-foreground">{p.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-semibold mb-3 block">Select Amount</Label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => { setAmount(a); setCustomAmount(""); }}
                      className={`rounded-xl p-3 border-2 font-semibold transition-all ${
                        amount === a ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      ₦{a.toLocaleString()}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Enter custom amount (min ₦100)"
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }}
                  className="h-12"
                />
              </div>

              <Button size="lg" className="w-full" onClick={handleFund} disabled={fundMutation.isPending || !finalAmount}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {fundMutation.isPending ? "Opening payment..." : `Fund ₦${finalAmount ? finalAmount.toLocaleString() : "0"} via ${PROVIDERS.find(p => p.id === provider)?.name}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {tab === "transfer" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-2">
                <ArrowRightLeft className="text-blue-600 shrink-0" size={18} />
                <p className="text-sm text-blue-800 dark:text-blue-200">Transfer funds to another SanTech user instantly at no cost.</p>
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Recipient Phone Number</Label>
                <Input placeholder="e.g. 08012345678" value={transferPhone} onChange={(e) => setTransferPhone(e.target.value)} className="h-12" />
              </div>
              <div>
                <Label className="font-semibold mb-2 block">Amount (₦)</Label>
                <Input type="number" placeholder="Enter amount" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="h-12" />
              </div>
              <div>
                <Label className="font-semibold mb-2 block">Note (optional)</Label>
                <Input placeholder="What's this transfer for?" value={transferNote} onChange={(e) => setTransferNote(e.target.value)} className="h-12" />
              </div>

              <Button size="lg" className="w-full" onClick={handleTransfer} disabled={transferMutation.isPending}>
                <CreditCard className="mr-2 h-4 w-4" />
                {transferMutation.isPending ? "Transferring..." : "Transfer Funds"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
