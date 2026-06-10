import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useInitiateFunding, useWalletTransfer } from "@workspace/api-client-react";
import { CreditCard, ArrowRightLeft, ExternalLink, Building2, Copy, CheckCircle2, PhoneCall, Landmark, Loader2, Clock, RefreshCw } from "lucide-react";

const PROVIDERS = [
  { id: "paystack", name: "Paystack", desc: "Cards, Bank Transfer, USSD" },
  { id: "monnify", name: "Monnify", desc: "Bank Transfer, Cards, USSD" },
];

const AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];
const SUPPORT_PHONE = "09026329296";

type Tab = "bank" | "fund" | "transfer" | "manual";

type PublicSettings = {
  bankTransferActive: boolean;
  bankAccountNumber: string;
  bankAccountName: string;
  bankName: string;
};

type FlwVA = {
  accountNumber: string;
  bankName: string;
  amount: number;
  expiresAt: string;
  reference: string;
};

export default function FundWallet() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("bank");
  const [provider, setProvider] = useState("paystack");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [transferPhone, setTransferPhone] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [bankSettings, setBankSettings] = useState<PublicSettings | null>(null);

  // Flutterwave VA state
  const [flwVA, setFlwVA] = useState<FlwVA | null>(null);
  const [flwLoading, setFlwLoading] = useState(false);
  const [flwAmount, setFlwAmount] = useState<number | null>(null);
  const [flwCustom, setFlwCustom] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d: PublicSettings) => setBankSettings(d))
      .catch(() => {});
  }, []);

  const fundMutation = useInitiateFunding({
    mutation: {
      onSuccess: (data: any) => {
        if (data.paymentUrl) {
          if (data.reference) localStorage.setItem("santech_last_ref", data.reference);
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

  const finalFundAmount = amount ?? (customAmount ? parseFloat(customAmount) : 0);
  const finalFlwAmount = flwVA?.amount ?? (flwAmount ?? (flwCustom ? parseFloat(flwCustom) : 0));

  const handleFund = () => {
    if (!finalFundAmount || finalFundAmount < 100) { toast({ title: "Minimum funding is ₦100", variant: "destructive" }); return; }
    fundMutation.mutate({ data: { amount: finalFundAmount, gateway: provider as any } });
  };

  const handleTransfer = () => {
    if (!transferPhone || !transferAmount) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    transferMutation.mutate({ data: { recipientPhone: transferPhone, amount: parseFloat(transferAmount), note: transferNote } });
  };

  const handleGenerateFlwVA = async (amt?: number) => {
    const useAmt = amt ?? finalFlwAmount;
    if (!useAmt || useAmt < 100) { toast({ title: "Enter an amount first (min ₦100)", variant: "destructive" }); return; }
    setFlwLoading(true);
    setFlwVA(null);
    try {
      const token = localStorage.getItem("santech_token");
      const res = await fetch("/api/wallet/fund/flutterwave-va", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: useAmt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate account");
      setFlwVA(data as FlwVA);
    } catch (err: any) {
      toast({ title: "Could not generate account", description: err.message, variant: "destructive" });
    } finally {
      setFlwLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const showManualTab = bankSettings?.bankTransferActive && bankSettings.bankAccountNumber;

  const TABS = [
    { id: "bank" as Tab, label: "Bank Transfer" },
    { id: "fund" as Tab, label: "Card / USSD" },
    { id: "transfer" as Tab, label: "Transfer" },
    ...(showManualTab ? [{ id: "manual" as Tab, label: "Manual" }] : []),
  ];

  // Countdown for VA expiry
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!flwVA) return;
    const interval = setInterval(() => {
      const diff = new Date(flwVA.expiresAt).getTime() - Date.now();
      if (diff <= 0) { setCountdown("Expired"); clearInterval(interval); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [flwVA]);

  return (
    <AppLayout>
      <PageHeader title="Fund Wallet" description="Add money to your SanTech wallet" />

      <div className="max-w-2xl">
        <div className="flex gap-1 mb-6 bg-muted p-1 rounded-xl w-fit flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── BANK TRANSFER (Flutterwave VA) ── */}
        {tab === "bank" && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <Landmark className="text-green-600 shrink-0" size={18} />
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  Get a <strong>one-time bank account</strong> for your exact amount. Transfer and your wallet is credited automatically — no receipt needed.
                </p>
              </div>

              {!flwVA ? (
                <>
                  <div>
                    <Label className="font-semibold mb-3 block">How much do you want to add?</Label>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {AMOUNTS.map((a) => (
                        <button
                          key={a}
                          onClick={() => { setFlwAmount(a); setFlwCustom(""); }}
                          className={`rounded-xl p-3 border-2 font-semibold transition-all ${
                            flwAmount === a ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                          }`}
                        >
                          ₦{a.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      placeholder="Or enter custom amount (min ₦100)"
                      value={flwCustom}
                      onChange={(e) => { setFlwCustom(e.target.value); setFlwAmount(null); }}
                      className="h-12"
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => handleGenerateFlwVA()}
                    disabled={flwLoading || !finalFlwAmount || finalFlwAmount < 100}
                  >
                    {flwLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Generating account...</>
                    ) : (
                      <><Landmark size={16} /> Get Bank Account Number</>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your One-Time Account</p>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                        <Clock size={12} />
                        {countdown || "Loading..."}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Bank</p>
                        <p className="font-bold text-lg">{flwVA.bankName}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Account Number</p>
                          <p className="font-bold text-3xl tracking-widest font-mono">{flwVA.accountNumber}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(flwVA.accountNumber, "acct")}
                          className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          {copied === "acct" ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                          <span className="ml-1 text-xs">{copied === "acct" ? "Copied!" : "Copy"}</span>
                        </Button>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-primary/10">
                        <div>
                          <p className="text-xs text-muted-foreground">Amount to transfer</p>
                          <p className="font-bold text-xl text-primary">₦{flwVA.amount.toLocaleString()}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(flwVA.amount.toString(), "amt")}
                          className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          {copied === "amt" ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                          <span className="ml-1 text-xs">{copied === "amt" ? "Copied!" : "Copy"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-1">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">How to complete payment</p>
                    <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                      <li>Open your bank app and transfer <strong>exactly ₦{flwVA.amount.toLocaleString()}</strong></li>
                      <li>Use the account number above — valid for <strong>1 hour</strong></li>
                      <li>Your wallet is credited <strong>automatically within seconds</strong></li>
                      <li>You'll get a notification when it reflects</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => { setFlwVA(null); }}
                    >
                      <RefreshCw size={14} /> Different Amount
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => handleGenerateFlwVA(flwVA.amount)}
                      disabled={flwLoading}
                    >
                      {flwLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      New Account
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── CARD / USSD ── */}
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
                        provider === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
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

              <Button size="lg" className="w-full" onClick={handleFund} disabled={fundMutation.isPending || !finalFundAmount}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {fundMutation.isPending ? "Opening payment..." : `Pay ₦${finalFundAmount ? finalFundAmount.toLocaleString() : "0"} via ${PROVIDERS.find(p => p.id === provider)?.name}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── TRANSFER ── */}
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

        {/* ── MANUAL BANK TRANSFER ── */}
        {tab === "manual" && bankSettings && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <Building2 className="text-green-600 shrink-0" size={18} />
                <p className="text-sm text-green-800 font-medium">Transfer directly to our bank account. Contact admin after sending.</p>
              </div>
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bank Account Details</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Bank</p>
                    <p className="font-bold text-lg">{bankSettings.bankName}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="font-bold text-2xl tracking-widest font-mono">{bankSettings.bankAccountNumber}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleCopy(bankSettings.bankAccountNumber, "manual")} className="shrink-0">
                      {copied === "manual" ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                      {copied === "manual" ? "Copied!" : "Copy"}
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
