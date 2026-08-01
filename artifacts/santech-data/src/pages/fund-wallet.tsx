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

  const { data: walletData, isLoading: vaLoading, refetch: refetchWallet } = useGetWallet();

  const existingFlwVa = walletData?.virtualAccountNumber
    ? { accountNumber: walletData.virtualAccountNumber!, bankName: normalizeBankName(walletData.virtualAccountBank) }
    : null;

  const flwVa = generatedFlwVa ?? existingFlwVa;

  const existingAspfiyVa = (walletData as any)?.aspfiyAccountNumber
    ? { accountNumber: (walletData as any).aspfiyAccountNumber as string, bankName: ((walletData as any).aspfiyAccountBank as string) ?? "Aspfiy" }
    : null;

  const aspfiyVa = generatedAspfiyVa ?? existingAspfiyVa;

  // Auto-generate Aspfiy account when wallet loads and user doesn't have one yet
  useEffect(() => {
    if (!vaLoading && walletData && !existingAspfiyVa && !generatedAspfiyVa && !aspfiyGenerating) {
      handleGenerateAspfiyVA().then(() => {
        // Refetch wallet so WalletCard on dashboard also updates
        refetchWallet();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaLoading, walletData]);

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
          <div className="space-y-4">
            {/* Info strip */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Landmark size={15} className="text-primary" />
              </div>
              <p className="text-sm text-foreground/80">
                Transfer any amount to any account below — your wallet is credited <strong>automatically</strong>.
              </p>
            </div>

            {vaLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" /> Loading your accounts…
              </div>
            ) : (
              <div className="space-y-3">

                {/* ── Account 1: Flutterwave / Nuvion MFB ── */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  {/* card header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 border-b border-orange-200/60 dark:border-orange-800/40">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                    <span className="font-semibold text-sm text-orange-700 dark:text-orange-300">Nuvion MFB</span>
                    <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300">Requires BVN/NIN</span>
                  </div>

                  {flwVa ? (
                    <div className="px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono font-bold text-2xl tracking-widest">{flwVa.accountNumber}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { navigator.clipboard.writeText(flwVa.accountNumber).then(() => { setFlwCopied(true); setTimeout(() => setFlwCopied(false), 2500); }); }}
                          className="shrink-0 gap-1.5 h-8 px-3"
                        >
                          {flwCopied ? <CheckCircle2 size={13} className="text-green-600" /> : <Copy size={13} />}
                          {flwCopied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Bank: <strong className="text-foreground">{flwVa.bankName}</strong></span>
                        <span>Name: <strong className="text-foreground">SanTech Data</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-4 space-y-3">
                      <p className="text-sm text-muted-foreground">CBN requires identity verification. Your details go directly to the bank — never stored on our servers.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setIdType("bvn"); setIdNumber(""); setFlwError(""); }}
                          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${idType === "bvn" ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300" : "border-border text-muted-foreground"}`}
                        >BVN</button>
                        <button
                          onClick={() => { setIdType("nin"); setIdNumber(""); setFlwError(""); }}
                          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${idType === "nin" ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300" : "border-border text-muted-foreground"}`}
                        >NIN</button>
                      </div>
                      <Input
                        type="tel" inputMode="numeric" maxLength={11}
                        placeholder={`Enter your 11-digit ${idType.toUpperCase()}`}
                        value={idNumber}
                        onChange={(e) => { setIdNumber(e.target.value.replace(/\D/g, "")); setFlwError(""); }}
                        className="h-11 font-mono tracking-widest"
                      />
                      <p className="text-xs text-muted-foreground">
                        {idType === "bvn" ? <>Dial <strong>*565*0#</strong> to get your BVN</> : <>Dial <strong>*346#</strong> to get your NIN</>}
                      </p>
                      {flwError && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{flwError}</p>}
                      <Button size="sm" className="w-full gap-2 bg-orange-500 hover:bg-orange-600 h-10" onClick={handleGenerateFlwVA} disabled={flwGenerating || idNumber.length !== 11}>
                        {flwGenerating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <>Activate Account</>}
                      </Button>
                    </div>
                  )}
                </div>

                {/* ── Account 2: Aspfiy (PalmPay / Paga) ── */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border-b border-emerald-200/60 dark:border-emerald-800/40">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                    <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">Aspfiy Virtual Account</span>
                    <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">No BVN Required</span>
                  </div>

                  {aspfiyVa ? (
                    <div className="px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono font-bold text-2xl tracking-widest">{aspfiyVa.accountNumber}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { navigator.clipboard.writeText(aspfiyVa.accountNumber).then(() => { setAspfiyCopied(true); setTimeout(() => setAspfiyCopied(false), 2500); }); }}
                          className="shrink-0 gap-1.5 h-8 px-3"
                        >
                          {aspfiyCopied ? <CheckCircle2 size={13} className="text-green-600" /> : <Copy size={13} />}
                          {aspfiyCopied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Bank: <strong className="text-foreground">{aspfiyVa.bankName}</strong></span>
                        <span>Name: <strong className="text-foreground">SanTech Data</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-4 flex items-center gap-3 text-muted-foreground text-sm">
                      <Loader2 size={16} className="animate-spin shrink-0" />
                      {aspfiyError ? (
                        <span className="text-destructive">{aspfiyError}</span>
                      ) : (
                        <span>Setting up your account automatically…</span>
                      )}
                    </div>
                  )}
                </div>

                {/* How it works */}
                <div className="flex gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40">
                  <div className="text-blue-500 shrink-0 mt-0.5">💡</div>
                  <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5 list-decimal list-inside">
                    <li>Copy any account number above</li>
                    <li>Transfer from any bank app, USSD, or internet banking</li>
                    <li>Your SanTech wallet is credited automatically</li>
                  </ol>
                </div>

              </div>
            )}
          </div>
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
