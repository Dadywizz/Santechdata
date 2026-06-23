import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, PhoneCall, ArrowRightLeft, Info, AlertTriangle, MessageCircle } from "lucide-react";

const NETWORKS = [
  { id: "MTN", name: "MTN", color: "bg-[#FFCB00] text-black", rate: 75 },
  { id: "AIRTEL", name: "Airtel", color: "bg-[#E40000] text-white", rate: 70 },
  { id: "GLO", name: "Glo", color: "bg-[#008000] text-white", rate: 65 },
  { id: "9MOBILE", name: "9Mobile", color: "bg-[#006633] text-white", rate: 65 },
];

const RECEIVE_PHONE = "08063136201";
const FEE = 20;
const MAX = 10000;

type RequestItem = {
  id: string;
  network: string;
  airtimeAmount: number;
  payoutAmount: number;
  rate: number;
  senderPhone: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string | null;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 size={11} className="mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle size={11} className="mr-1" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock size={11} className="mr-1" />Pending</Badge>;
}

const SUPPORT_PHONE = "09026329296";

export default function AirtimeToCash() {
  const { toast } = useToast();
  const [network, setNetwork] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [serviceActive, setServiceActive] = useState(true);

  const selectedNetwork = NETWORKS.find((n) => n.id === network);
  const airtimeAmt = parseFloat(amount) || 0;
  const payout = airtimeAmt > 0 && selectedNetwork
    ? Math.floor(airtimeAmt * selectedNetwork.rate / 100) - FEE
    : 0;

  useState(() => {
    const token = sessionStorage.getItem("santech_token");
    fetch("/api/airtime-to-cash/status", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d: { active: boolean }) => setServiceActive(d.active))
      .catch(() => {});
    fetch("/api/airtime-to-cash", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setRequests(d); setLoadingHistory(false); })
      .catch(() => setLoadingHistory(false));
  });

  const handleSubmit = async () => {
    if (!network) { toast({ title: "Select a network", variant: "destructive" }); return; }
    if (airtimeAmt < 100) { toast({ title: "Minimum ₦100", variant: "destructive" }); return; }
    if (airtimeAmt > MAX) { toast({ title: `Maximum ₦${MAX.toLocaleString()}`, variant: "destructive" }); return; }
    if (!phone.match(/^0[789]\d{9}$/)) { toast({ title: "Enter a valid phone number", variant: "destructive" }); return; }

    setLoading(true);
    try {
      const token = sessionStorage.getItem("santech_token");
      const res = await fetch("/api/airtime-to-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ network, airtimeAmount: airtimeAmt, senderPhone: phone }),
      });
      const data = await res.json() as RequestItem & { error?: string };
      if (!res.ok) {
        toast({ title: "Failed", description: data.error ?? "Please try again", variant: "destructive" });
        return;
      }
      setRequests((prev) => [data, ...prev]);
      setAmount("");
      setPhone("");
      setNetwork(null);
      toast({
        title: "Request submitted!",
        description: `Now send ₦${airtimeAmt.toLocaleString()} ${network} airtime to ${RECEIVE_PHONE}. You'll receive ₦${payout.toLocaleString()} in your wallet once approved.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Airtime to Cash" description="Convert your airtime to wallet credit" />

      {!serviceActive && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3 items-start">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-red-800">Service Temporarily Unavailable</p>
            <p className="text-sm text-red-700 mt-0.5">
              Airtime to Cash is currently frozen by the admin. Please contact us to inquire when it will resume.
            </p>
            <a href={`tel:${SUPPORT_PHONE}`} className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-red-800 underline underline-offset-2">
              <MessageCircle size={14} /> Call {SUPPORT_PHONE}
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5 space-y-5">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex gap-2 text-sm text-amber-900">
                <MessageCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">⚠️ Contact Admin Before Sending Airtime</p>
                  <p className="text-xs leading-relaxed">
                    You <strong>must</strong> submit this form first, then contact admin to confirm before sending any airtime.
                    Airtime sent without prior confirmation will <strong>not</strong> be credited.
                  </p>
                  <a href={`tel:${SUPPORT_PHONE}`} className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-amber-800 underline underline-offset-2">
                    <PhoneCall size={12} /> {SUPPORT_PHONE}
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex gap-2 text-sm text-blue-800">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">How it works</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-xs">
                    <li>Fill in the form below and submit</li>
                    <li>Contact admin on <strong>{SUPPORT_PHONE}</strong> to confirm</li>
                    <li>Send the airtime to <strong>{RECEIVE_PHONE}</strong></li>
                    <li>Admin verifies and credits your wallet within minutes</li>
                  </ol>
                </div>
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Select Network</Label>
                <div className="grid grid-cols-2 gap-2">
                  {NETWORKS.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setNetwork(n.id)}
                      className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        network === n.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mr-1 ${n.color}`}>{n.name}</span>
                      <span className="text-muted-foreground">{n.rate}%</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Airtime Amount (₦)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount (min ₦100, max ₦10,000)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12"
                />
              </div>

              <div>
                <Label className="font-semibold mb-2 block">Your Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground mt-1">The number that will send the airtime</p>
              </div>

              {airtimeAmt > 0 && selectedNetwork && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Airtime value</span>
                    <span className="font-semibold">₦{airtimeAmt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate ({selectedNetwork.rate}%)</span>
                    <span>₦{Math.floor(airtimeAmt * selectedNetwork.rate / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Processing fee</span>
                    <span>-₦{FEE}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary border-t border-primary/20 pt-2">
                    <span>You receive</span>
                    <span>₦{Math.max(0, payout).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {selectedNetwork && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 flex gap-2 text-sm text-amber-800">
                  <PhoneCall size={15} className="shrink-0 mt-0.5" />
                  <span>After submitting, send your airtime to <strong>{RECEIVE_PHONE}</strong> from the phone number you entered above.</span>
                </div>
              )}

              <Button className="w-full h-12 text-base" onClick={handleSubmit} disabled={loading || !serviceActive}>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {loading ? "Submitting..." : !serviceActive ? "Service Unavailable" : "Submit Request"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Your Requests</h3>
          {loadingHistory ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl">
              <ArrowRightLeft className="mx-auto h-10 w-10 opacity-20 mb-2" />
              <p>No requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-semibold">{r.network} — ₦{r.airtimeAmount.toLocaleString()}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.status === "approved"
                            ? `₦${r.payoutAmount.toLocaleString()} credited to wallet`
                            : `Expected payout: ₦${r.payoutAmount.toLocaleString()}`}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.adminNote && r.status === "rejected" && (
                      <p className="text-xs text-red-600 mt-1">Reason: {r.adminNote}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
