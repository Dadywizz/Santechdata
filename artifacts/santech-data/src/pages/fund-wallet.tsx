import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useInitiateFunding, useWalletTransfer } from "@workspace/api-client-react";
import { CreditCard, ArrowRightLeft, ExternalLink, Building2, Copy, CheckCircle2, PhoneCall, Landmark, Loader2 } from "lucide-react";

const PROVIDERS = [
  { id: "paystack", name: "Paystack", desc: "Cards, Bank Transfer, USSD" },
  { id: "monnify", name: "Monnify", desc: "Bank Transfer, Cards, USSD" },
];

const AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];
const SUPPORT_PHONE = "09026329296";

type Tab = "fund" | "transfer" | "dedicated" | "bank";

type PublicSettings = {
  bankTransferActive: boolean;
  bankAccountNumber: string;
  bankAccountName: string;
  bankName: string;
};

type VirtualAccount = {
  virtualAccountNumber: string | null;
  virtualAccountBank: string | null;
};

export default function FundWallet() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("fund");
  const [provider, setProvider] = useState("paystack");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [transferPhone, setTransferPhone] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [bankSettings, setBankSettings] = useState<PublicSettings | null>(null);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d: PublicSettings) => setBankSettings(d))
      .catch(() => {});

    const token = localStorage.getItem("santech_token");
    if (token) {
      fetch("/api/wallet", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d: VirtualAccount) => setVirtualAccount(d))
        .catch(() => {});
    }
  }, []);

  const fundMutation = useInitiateFunding({
    mutation: {
      onSuccess: (data: any) => {
        if (data.paymentUrl) {
          if (data.reference) {
            localStorage.setItem("santech_last_ref", data.reference);
          }
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const showBankTab = bankSettings?.bankTransferActive && bankSettings.bankAccountNumber;
  const showDedicatedTab = !!(virtualAccount?.virtualAccountNumber);

  const TABS = [
    { id: "fund" as Tab, label: "Add Money" },
    ...(showDedicatedTab ? [{ id: "dedicated" as Tab, label: "My Account" }] : []),
    { id: "transfer" as Tab, label: "Transfer" },
    ...(showBankTab ? [{ id: "bank" as Tab, label: "Bank Transfer" }] : []),
  ];

  return (
    <AppLayout>
      <PageHeader title="Fund Wallet" description="Add money to your SanTech wallet" />

      <div className="max-w-2xl">
        <div className="flex gap-2 mb-6 bg-muted p-1 rounded-xl w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
                tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
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
                      onClick={() => setProvider(p.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        provider === p.id
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

        {tab === "dedicated" && virtualAccount?.virtualAccountNumber && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <Landmark className="text-green-600 shrink-0" size={18} />
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">This account is yours alone. Transfer any amount and your wallet is credited automatically — no need to notify anyone.</p>
              </div>

              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Dedicated Account</p>
                  <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Auto-credited</Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Bank</p>
                    <p className="font-bold text-lg">{virtualAccount.virtualAccountBank}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="font-bold text-2xl tracking-widest font-mono">{virtualAccount.virtualAccountNumber}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(virtualAccount.virtualAccountNumber!)}
                      className="shrink-0"
                    >
                      {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Account Name</p>
                    <p className="font-semibold">{JSON.parse(localStorage.getItem("santech_user") || "{}").fullName ?? "SanTech Customer"}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">How it works</p>
                <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Open your bank app and do a transfer to the account above</li>
                  <li>Your SanTech wallet is credited <strong>automatically within seconds</strong></li>
                  <li>You will receive a notification when it reflects</li>
                </ol>
              </div>
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

        {tab === "bank" && bankSettings && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <Building2 className="text-green-600 shrink-0" size={18} />
                <p className="text-sm text-green-800 font-medium">Transfer directly to our bank account. Contact admin after sending.</p>
              </div>

              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bank Account Details</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Bank</p>
                      <p className="font-bold text-lg">{bankSettings.bankName}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="font-bold text-2xl tracking-widest font-mono">{bankSettings.bankAccountNumber}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(bankSettings.bankAccountNumber)}
                      className="shrink-0"
                    >
                      {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Account Name</p>
                    <p className="font-semibold">{bankSettings.bankAccountName}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <p className="text-sm font-semibold text-amber-900">After transferring:</p>
                <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                  <li>Transfer your desired amount to the account above</li>
                  <li>Take a screenshot of the transfer receipt</li>
                  <li>Contact admin on <strong>{SUPPORT_PHONE}</strong> with your name and screenshot</li>
                  <li>Your wallet will be credited within minutes</li>
                </ol>
              </div>

              <a
                href={`tel:${SUPPORT_PHONE}`}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
              >
                <PhoneCall size={16} />
                Call Admin — {SUPPORT_PHONE}
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
