import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useInitiateFunding, useWalletTransfer, useGetWallet } from "@workspace/api-client-react";
import { CreditCard, ArrowRightLeft, ExternalLink, Building2, Copy, CheckCircle2, PhoneCall, Zap, Landmark, Loader2 } from "lucide-react";

const AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];
const SUPPORT_PHONE = "09026329296";

type Tab = "bank" | "fund" | "transfer" | "manual";

type PublicSettings = {
  bankTransferActive: boolean;
  bankAccountNumber: string;
  bankAccountName: string;
  bankName: string;
};

function normalizeBankName(name: string | null | undefined): string {
  if (!name) return "Bank";
  if (/indulge/i.test(name)) return "Nuvion MFB";
  return name;
}

export default function FundWallet() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("bank");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [pendingGateway, setPendingGateway] = useState<"paystack" | "flutterwave" | null>(null);
  const [transferPhone, setTransferPhone] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [bankSettings, setBankSettings] = useState<PublicSettings | null>(null);
  const [copied, setCopied] = useState(false);

  // Flutterwave VA state
  const [flwGenerating, setFlwGenerating] = useState(false);
  const [flwError, setFlwError] = useState("");
  const [flwCopied, setFlwCopied] = useState(false);
  const [generatedFlwVa, setGeneratedFlwVa] = useState<{ accountNumber: string; bankName: string } | null>(null);
  const [idType, setIdType] = useState<"bvn" | "nin">("bvn");
  const [idNumber, setIdNumber] = useState("");

  // Aspfiy VA state
  const [aspfiyGenerating, setAspfiyGenerating] = useState(false);
  const [aspfiyError, setAspfiyError] = useState("");
  const [aspfiyCopied, setAspfiyCopied] = useState(false);
  const [generatedAspfiyVa, setGeneratedAspfiyVa] = useState<{ accountNumber: string; bankName: string } | null>(null);

  const { data: walletData, isLoading: vaLoading } = useGetWallet();

  const existingFlwVa = walletData?.virtualAccountNumber
    ? { accountNumber: walletData.virtualAccountNumber!, bankName: normalizeBankName(walletData.virtualAccountBank) }
    : null;

  const flwVa = generatedFlwVa ?? existingFlwVa;

  const existingAspfiyVa = (walletData as any)?.aspfiyAccountNumber
    ? { accountNumber: (walletData as any).aspfiyAccountNumber as string, bankName: ((walletData as any).aspfiyAccountBank as string) ?? "Aspfiy" }
    : null;

  const aspfiyVa = generatedAspfiyVa ?? existingAspfiyVa;

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
        setPendingGateway(null);
        toast({ title: "Payment failed to start", description: error.data?.error || "Please try again", variant: "destructive" });
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

  const handleFund = (gateway: "paystack" | "flutterwave") => {
    if (!finalAmount || finalAmount < 100) { toast({ title: "Minimum funding is ₦100", variant: "destructive" }); return; }
    setPendingGateway(gateway);
    fundMutation.mutate({ data: { amount: finalAmount, gateway: gateway as any } });
  };

  const handleTransfer = () => {
    if (!transferPhone || !transferAmount) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    transferMutation.mutate({ data: { recipientPhone: transferPhone, amount: parseFloat(transferAmount), note: transferNote } });
  };

  const handleGenerateAspfiyVA = async () => {
    setAspfiyGenerating(true);
    setAspfiyError("");
    try {
      const token = sessionStorage.getItem("santech_token");
      const res = await fetch("/api/wallet/generate-aspfiy-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate account");
      setGeneratedAspfiyVa({ accountNumber: data.accountNumber, bankName: data.bankName ?? "Aspfiy" });
    } catch (err: any) {
      setAspfiyError(err.message || "Could not generate account. Please try again.");
    } finally {
      setAspfiyGenerating(false);
    }
  };

  const handleGenerateFlwVA = async () => {
    const trimmed = idNumber.replace(/\s+/g, "");
    if (!trimmed || !/^\d{11}$/.test(trimmed)) {
      setFlwError(`Please enter your valid 11-digit ${idType.toUpperCase()}.`);
      return;
    }
    setFlwGenerating(true);
    setFlwError("");
    try {
      const token = sessionStorage.getItem("santech_token");
      const res = await fetch("/api/wallet/generate-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(idType === "bvn" ? { bvn: trimmed } : { nin: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate account");
      setGeneratedFlwVa({ accountNumber: data.virtualAccountNumber, bankName: normalizeBankName(data.virtualAccountBank) });
      setIdNumber("");
    } catch (err: any) {
      setFlwError(err.message || "Could not generate account. Please try again.");
    } finally {
      setFlwGenerating(false);
    }
  };

  const showManualTab = bankSettings?.bankTransferActive && bankSettings.bankAccountNumber;

  const TABS: { id: Tab; label: string }[] = [
    { id: "bank", label: "Bank Transfer" },
    { id: "fund", label: "Card / USSD" },
    { id: "transfer", label: "Transfer" },
    ...(showManualTab ? [{ id: "manual" as Tab, label: "Manual" }] : []),
  ];

  return (
    <AppLayout>
      <PageHeader title="Fund Wallet" description="Add money to your SanTech wallet" />

      <div className="max-w-2xl">
        <div className="flex gap-1 mb-6 bg-muted p-1 rounded-xl w-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-2 rounded-lg font-medium text-sm transition-all text-center whitespace-nowrap ${
                tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── BANK TRANSFER — dedicated virtual accounts ── */}
        {tab === "bank" && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <Landmark className="text-orange-500 shrink-0" size={18} />
                <p className="text-sm text-orange-900 dark:text-orange-100 font-medium">
                  Your <strong>personal bank account</strong> — transfer any amount anytime and your wallet is credited automatically.
                </p>
              </div>

              {/* ── Flutterwave dedicated account ── */}
              {vaLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" /> Loading account details...
                </div>
              ) : flwVa ? (
                <div className="space-y-4">
                  <div className="rounded-xl border-2 border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20 p-5 space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Dedicated Account</p>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Account Number</p>
                        <p className="font-bold text-3xl tracking-widest font-mono">{flwVa.accountNumber}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { navigator.clipboard.writeText(flwVa.accountNumber).then(() => { setFlwCopied(true); setTimeout(() => setFlwCopied(false), 2500); }); }}
                        className="shrink-0 gap-1.5"
                      >
                        {flwCopied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                        {flwCopied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-orange-200 dark:border-orange-700">
                      <div>
                        <p className="text-xs text-muted-foreground">Bank</p>
                        <p className="font-semibold text-sm">{flwVa.bankName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p className="font-semibold text-sm">SanTech Data</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-1.5">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">How it works</p>
                    <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5 list-decimal list-inside">
                      <li>Copy the account number above</li>
                      <li>Transfer from any bank app, USSD, or internet banking</li>
                      <li>Your wallet is credited automatically</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">BVN or NIN required</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">CBN regulation requires this account to be linked to your identity. Your details go directly to the bank — never stored on our servers.</p>
                  </div>

                  <div>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => { setIdType("bvn"); setIdNumber(""); setFlwError(""); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${idType === "bvn" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-border text-muted-foreground"}`}
                      >BVN</button>
                      <button
                        onClick={() => { setIdType("nin"); setIdNumber(""); setFlwError(""); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${idType === "nin" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-border text-muted-foreground"}`}
                      >NIN</button>
                    </div>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder={`Enter your 11-digit ${idType.toUpperCase()}`}
                      value={idNumber}
                      onChange={(e) => { setIdNumber(e.target.value.replace(/\D/g, "")); setFlwError(""); }}
                      className="h-12 font-mono tracking-widest text-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {idType === "bvn"
                        ? <>Dial <strong>*565*0#</strong> on any phone to get your BVN.</>
                        : <>Dial <strong>*346#</strong> on your NIN-registered phone to get your NIN.</>}
                    </p>
                  </div>

                  {flwError && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{flwError}</p>}

                  <Button
                    size="lg"
                    className="w-full gap-2 bg-orange-500 hover:bg-orange-600"
                    onClick={handleGenerateFlwVA}
                    disabled={flwGenerating || idNumber.length !== 11}
                  >
                    {flwGenerating
                      ? <><Loader2 size={16} className="animate-spin" /> Generating...</>
                      : <><Landmark size={16} /> Get My Bank Account</>}
                  </Button>
                </div>
              )}

              {/* ── Aspfiy dedicated account ── */}
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aspfiy Virtual Account</p>

                {vaLoading ? (
                  <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
                    <Loader2 size={16} className="animate-spin" /> Loading...
                  </div>
                ) : aspfiyVa ? (
                  <div className="rounded-xl border-2 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 p-5 space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Aspfiy Account</p>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Account Number</p>
                        <p className="font-bold text-3xl tracking-widest font-mono">{aspfiyVa.accountNumber}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { navigator.clipboard.writeText(aspfiyVa.accountNumber).then(() => { setAspfiyCopied(true); setTimeout(() => setAspfiyCopied(false), 2500); }); }}
                        className="shrink-0 gap-1.5"
                      >
                        {aspfiyCopied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                        {aspfiyCopied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-green-200 dark:border-green-700">
                      <div>
                        <p className="text-xs text-muted-foreground">Bank</p>
                        <p className="font-semibold text-sm">{aspfiyVa.bankName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p className="font-semibold text-sm">SanTech Data</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Get a second dedicated account powered by Aspfiy — no BVN or NIN required.</p>
                    {aspfiyError && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{aspfiyError}</p>}
                    <Button
                      size="lg"
                      className="w-full gap-2 bg-green-600 hover:bg-green-700"
                      onClick={handleGenerateAspfiyVA}
                      disabled={aspfiyGenerating}
                    >
                      {aspfiyGenerating
                        ? <><Loader2 size={16} className="animate-spin" /> Generating...</>
                        : <><Landmark size={16} /> Get Aspfiy Account</>}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── FUND WALLET (Paystack + Flutterwave checkout) ── */}
        {tab === "fund" && (
          <Card>
            <CardContent className="p-6 space-y-6">
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

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Choose payment method</p>

                <button
                  onClick={() => handleFund("paystack")}
                  disabled={fundMutation.isPending || !finalAmount || finalAmount < 100}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0BA4DB]/10 flex items-center justify-center shrink-0">
                    <CreditCard size={20} className="text-[#0BA4DB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Paystack</p>
                    <p className="text-xs text-muted-foreground">Card · Bank Transfer · USSD</p>
                  </div>
                  {fundMutation.isPending && pendingGateway === "paystack"
                    ? <span className="text-xs text-muted-foreground animate-pulse">Opening...</span>
                    : <ExternalLink size={14} className="text-muted-foreground shrink-0" />}
                </button>

                <button
                  onClick={() => handleFund("flutterwave")}
                  disabled={fundMutation.isPending || !finalAmount || finalAmount < 100}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-orange-400/40 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                    <Zap size={20} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Flutterwave</p>
                    <p className="text-xs text-muted-foreground">Card · Bank Transfer · USSD · Mobile Money</p>
                  </div>
                  {fundMutation.isPending && pendingGateway === "flutterwave"
                    ? <span className="text-xs text-muted-foreground animate-pulse">Opening...</span>
                    : <ExternalLink size={14} className="text-muted-foreground shrink-0" />}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── WALLET TRANSFER ── */}
        {tab === "transfer" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
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
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {transferMutation.isPending ? "Transferring..." : "Transfer Funds"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── MANUAL BANK TRANSFER (only if admin enabled it) ── */}
        {tab === "manual" && bankSettings && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <Building2 className="text-green-600 shrink-0" size={18} />
                <p className="text-sm text-green-800 font-medium">Transfer directly to our bank account, then contact admin with your receipt.</p>
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
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(bankSettings.bankAccountNumber).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} className="shrink-0">
                      {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                      <span className="ml-1">{copied ? "Copied!" : "Copy"}</span>
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
                  <li>Take a screenshot of your receipt</li>
                  <li>Contact admin on <strong>{SUPPORT_PHONE}</strong> with your name and screenshot</li>
                  <li>Your wallet will be credited within minutes</li>
                </ol>
              </div>
              <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
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
