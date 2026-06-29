import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Search, Crown, Loader2, RefreshCw, ShieldOff, ShieldCheck,
  UserX, Wallet, ReceiptText, CalendarDays,
} from "lucide-react";
import { format } from "date-fns";

const tok = () => sessionStorage.getItem("santech_token") ?? "";

async function fetchResellers() {
  const res = await fetch("/api/admin/resellers", { headers: { Authorization: `Bearer ${tok()}` } });
  if (!res.ok) return { resellers: [], total: 0 };
  return res.json();
}

async function patchReseller(id: string, action: "suspend" | "activate" | "revoke") {
  const res = await fetch(`/api/admin/resellers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
    body: JSON.stringify({ action }),
  });
  return res.json();
}

type Reseller = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  resellerSince: string | null;
  walletBalance: number;
  transactionCount: number;
};

export default function AdminResellers() {
  const { toast } = useToast();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchResellers();
    setResellers(data.resellers ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = resellers.filter(
    (r) => !search || r.fullName.toLowerCase().includes(search.toLowerCase())
      || r.email.toLowerCase().includes(search.toLowerCase())
      || r.phone.includes(search)
  );

  const handleAction = async (id: string, action: "suspend" | "activate" | "revoke") => {
    setActioning(id + action);
    const res = await patchReseller(id, action);
    if (res.message) {
      toast({ title: res.message });
      await load();
    } else {
      toast({ title: "Action failed", description: res.error, variant: "destructive" });
    }
    setActioning(null);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Resellers"
        subtitle={`${total} active reseller${total !== 1 ? "s" : ""}`}
        action={
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Crown size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-900">{total}</p>
                <p className="text-xs text-slate-500">Total Resellers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <Wallet size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-900">
                  ₦{(resellers.filter((r) => r.status === "active").length * 500).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Revenue Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="pl-9 h-10 text-sm"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-medium">
            {search ? "No resellers match your search." : "No resellers yet. When customers upgrade, they'll appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {r.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-800">{r.fullName}</p>
                        <Crown size={12} className="text-amber-500" />
                      </div>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </div>
                  </div>
                  <Badge className={r.status === "active"
                    ? "bg-green-100 text-green-700 border-green-200 text-[10px]"
                    : "bg-red-100 text-red-700 border-red-200 text-[10px]"
                  }>
                    {r.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <Wallet size={14} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-xs font-bold text-slate-700">₦{r.walletBalance.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Balance</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <ReceiptText size={14} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-xs font-bold text-slate-700">{r.transactionCount}</p>
                    <p className="text-[10px] text-slate-400">Transactions</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <CalendarDays size={14} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-xs font-bold text-slate-700">
                      {r.resellerSince ? format(new Date(r.resellerSince), "d MMM yy") : "—"}
                    </p>
                    <p className="text-[10px] text-slate-400">Since</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-3">{r.phone}</p>

                <div className="flex gap-2">
                  {r.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(r.id, "suspend")}
                      disabled={actioning === r.id + "suspend"}
                      className="gap-1 h-8 text-xs flex-1"
                    >
                      {actioning === r.id + "suspend" ? <Loader2 size={11} className="animate-spin" /> : <ShieldOff size={11} />}
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(r.id, "activate")}
                      disabled={actioning === r.id + "activate"}
                      className="gap-1 h-8 text-xs flex-1 text-green-600 border-green-200"
                    >
                      {actioning === r.id + "activate" ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                      Activate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(r.id, "revoke")}
                    disabled={actioning === r.id + "revoke"}
                    className="gap-1 h-8 text-xs flex-1 text-red-600 border-red-200"
                  >
                    {actioning === r.id + "revoke" ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />}
                    Revoke
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
