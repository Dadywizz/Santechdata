import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, XCircle, ArrowRightLeft, Search, PowerOff, Power } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type RequestItem = {
  id: string;
  userId: string;
  network: string;
  airtimeAmount: number;
  payoutAmount: number;
  rate: number;
  senderPhone: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string | null;
  createdAt: string;
  user?: { fullName: string; email: string; phone: string } | null;
};

const NETWORK_COLORS: Record<string, string> = {
  MTN: "bg-[#FFCB00] text-black",
  AIRTEL: "bg-[#E40000] text-white",
  GLO: "bg-[#008000] text-white",
  "9MOBILE": "bg-[#006633] text-white",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 size={11} className="mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle size={11} className="mr-1" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock size={11} className="mr-1" />Pending</Badge>;
}

export default function AdminAirtimeToCash() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serviceActive, setServiceActive] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);

  useState(() => {
    const token = localStorage.getItem("santech_token");
    fetch("/api/admin/airtime-to-cash", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setRequests(d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((s: Record<string, string>) => {
        if (s.airtimeToCashActive !== undefined) setServiceActive(s.airtimeToCashActive !== "false");
      })
      .catch(() => {});
  });

  const handleToggle = async (val: boolean) => {
    setSavingToggle(true);
    const token = localStorage.getItem("santech_token");
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ airtimeToCashActive: String(val) }),
    });
    setServiceActive(val);
    setSavingToggle(false);
    toast({ title: val ? "Service activated" : "Service frozen", description: val ? "Customers can now submit requests" : "No new requests will be accepted" });
  };

  const handleReview = async () => {
    if (!selected || !action) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("santech_token");
      const res = await fetch(`/api/admin/airtime-to-cash/${selected.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, adminNote: adminNote || undefined }),
      });
      const data = await res.json() as RequestItem & { error?: string };
      if (!res.ok) {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
        return;
      }
      setRequests((prev) => prev.map((r) => r.id === data.id ? { ...data, user: selected.user } : r));
      toast({ title: action === "approve" ? "Approved — wallet credited!" : "Request rejected" });
      setSelected(null);
      setAction(null);
      setAdminNote("");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = requests.filter((r) => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || r.network.toLowerCase().includes(q)
      || r.senderPhone.includes(q)
      || r.user?.fullName.toLowerCase().includes(q)
      || r.user?.email.toLowerCase().includes(q)
      || r.user?.phone.includes(q);
    return matchStatus && matchSearch;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <PageHeader
          title="Airtime to Cash"
          description={pendingCount > 0 ? `${pendingCount} pending request${pendingCount > 1 ? "s" : ""} awaiting review` : "Manage airtime-to-cash requests"}
        />
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 ${serviceActive ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          {serviceActive
            ? <Power size={16} className="text-green-600" />
            : <PowerOff size={16} className="text-red-500" />}
          <span className={`text-sm font-semibold ${serviceActive ? "text-green-700" : "text-red-600"}`}>
            {serviceActive ? "Service Active" : "Service Frozen"}
          </span>
          <Switch
            checked={serviceActive}
            onCheckedChange={handleToggle}
            disabled={savingToggle}
          />
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/30"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No requests found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((r) => (
                <div key={r.id} className="p-4 flex items-center gap-4 flex-wrap">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${NETWORK_COLORS[r.network] || "bg-muted"}`}>
                    {r.network[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{r.user?.fullName ?? "Unknown"} · {r.network}</p>
                    <p className="text-sm text-muted-foreground">{r.user?.email} · Sender: {r.senderPhone}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₦{r.airtimeAmount.toLocaleString()} airtime</p>
                    <p className="text-sm text-muted-foreground">Payout: ₦{r.payoutAmount.toLocaleString()} ({r.rate}% - ₦20)</p>
                  </div>
                  <StatusBadge status={r.status} />
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700"
                        onClick={() => { setSelected(r); setAction("approve"); setAdminNote(""); }}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => { setSelected(r); setAction("reject"); setAdminNote(""); }}>
                        Reject
                      </Button>
                    </div>
                  )}
                  {r.adminNote && (
                    <p className="w-full text-xs text-muted-foreground">Note: {r.adminNote}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><strong>Customer:</strong> {selected.user?.fullName}</p>
                <p><strong>Network:</strong> {selected.network}</p>
                <p><strong>Airtime sent:</strong> ₦{selected.airtimeAmount.toLocaleString()}</p>
                <p><strong>Payout:</strong> ₦{selected.payoutAmount.toLocaleString()}</p>
                <p><strong>Sender phone:</strong> {selected.senderPhone}</p>
              </div>
              {action === "approve" && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  ✅ <strong>₦{selected.payoutAmount.toLocaleString()}</strong> will be added to the customer's wallet immediately.
                </p>
              )}
              <div>
                <Label className="font-semibold mb-2 block">
                  {action === "approve" ? "Note (optional)" : "Reason for rejection"}
                </Label>
                <Input
                  placeholder={action === "approve" ? "Add a note..." : "e.g. Airtime not received"}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setAction(null); }}>Cancel</Button>
            <Button
              onClick={handleReview}
              disabled={submitting || (action === "reject" && !adminNote)}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {submitting ? "Processing..." : action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
