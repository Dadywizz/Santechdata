import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAdminGetDataPlans, getAdminGetDataPlansQueryKey, useAdminCreateDataPlan, useAdminUpdateDataPlan, useAdminDeleteDataPlan } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wifi, CheckCircle2, AlertCircle, Search, Copy, Loader2, RefreshCw, ExternalLink } from "lucide-react";

const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
const NETWORK_COLORS: Record<string, string> = {
  MTN: "bg-[#FFCB00] text-black",
  AIRTEL: "bg-[#E40000] text-white",
  GLO: "bg-[#008000] text-white",
  "9MOBILE": "bg-[#006633] text-white",
};

/** Fetch Flutterwave data plans for a given network via the admin endpoint */
async function fetchFlwPlans(network: string) {
  const token = localStorage.getItem("santech_token");
  const res = await fetch(`/api/admin/flutterwave-plans?network=${encodeURIComponent(network)}`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to fetch plans");
  }
  return res.json() as Promise<{ network: string; plans: Array<{ item_code: string; name: string; amount: number; biller_name: string }> }>;
}

/** Lookup panel shown inside the plan form */
function FlwPlanBrowser({ network, onSelect }: { network: string; onSelect: (code: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Array<{ item_code: string; name: string; amount: number }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFlwPlans(network);
      setPlans(data.plans);
      if (!data.plans.length) setError(`No data bundles found for ${network} via Flutterwave. IP may not be whitelisted.`);
    } catch (e: any) {
      setError(e.message ?? "Error");
      setPlans(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Browse {network} Plans on Flutterwave</p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={load} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          {loading ? "Loading…" : plans ? "Refresh" : "Fetch Plans"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {plans && plans.length > 0 && (
        <div className="divide-y rounded border bg-background max-h-48 overflow-y-auto text-xs">
          {plans.map((p) => (
            <div key={p.item_code} className="flex items-center justify-between px-3 py-2 gap-2 hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <span className="font-mono font-bold text-primary mr-2">{p.item_code}</span>
                <span className="text-muted-foreground">{p.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold">₦{p.amount?.toLocaleString()}</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onSelect(p.item_code)}>
                  Use
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!plans && !loading && (
        <p className="text-xs text-muted-foreground">Click "Fetch Plans" to load live item codes from Flutterwave (requires IP to be whitelisted).</p>
      )}
    </div>
  );
}

function PlanForm({ plan, onClose }: { plan?: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    network: plan?.network || "MTN",
    name: plan?.name || "",
    size: plan?.size || "",
    validity: plan?.validity || "30 Days",
    price: plan?.price?.toString() || "",
    costPrice: plan?.costPrice?.toString() || "",
    providerCode: plan?.providerCode || "",
  });

  const createMutation = useAdminCreateDataPlan({
    mutation: {
      onSuccess: () => {
        toast({ title: "Data plan created" });
        queryClient.invalidateQueries({ queryKey: getAdminGetDataPlansQueryKey() });
        onClose();
      },
      onError: (e: any) => toast({ title: "Failed", description: e.data?.error, variant: "destructive" }),
    },
  });

  const updateMutation = useAdminUpdateDataPlan({
    mutation: {
      onSuccess: () => {
        toast({ title: "Data plan updated" });
        queryClient.invalidateQueries({ queryKey: getAdminGetDataPlansQueryKey() });
        onClose();
      },
      onError: (e: any) => toast({ title: "Failed", description: e.data?.error, variant: "destructive" }),
    },
  });

  const handleSubmit = () => {
    if (plan) {
      updateMutation.mutate({
        id: plan.id,
        data: {
          price: parseFloat(form.price),
          costPrice: parseFloat(form.costPrice),
          name: form.name,
          providerCode: form.providerCode,
        } as any,
      });
    } else {
      createMutation.mutate({
        data: {
          network: form.network,
          name: form.name,
          size: form.size,
          validity: form.validity,
          price: parseFloat(form.price),
          costPrice: parseFloat(form.costPrice),
          providerCode: form.providerCode,
        } as any,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4 pt-2">
      {!plan && (
        <>
          <div>
            <Label className="font-semibold mb-2 block">Network</Label>
            <Select value={form.network} onValueChange={(v) => setForm(f => ({ ...f, network: v }))}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-semibold mb-2 block">Size</Label>
              <Input placeholder="e.g. 1GB" value={form.size} onChange={(e) => setForm(f => ({ ...f, size: e.target.value }))} className="h-12" />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Validity</Label>
              <Input placeholder="e.g. 30 Days" value={form.validity} onChange={(e) => setForm(f => ({ ...f, validity: e.target.value }))} className="h-12" />
            </div>
          </div>
        </>
      )}
      <div>
        <Label className="font-semibold mb-2 block">Plan Name</Label>
        <Input placeholder="e.g. MTN 1GB Daily" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-12" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="font-semibold mb-2 block">Selling Price (₦)</Label>
          <Input type="number" placeholder="0.00" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} className="h-12" />
        </div>
        <div>
          <Label className="font-semibold mb-2 block">Cost Price (₦)</Label>
          <Input type="number" placeholder="0.00" value={form.costPrice} onChange={(e) => setForm(f => ({ ...f, costPrice: e.target.value }))} className="h-12" />
        </div>
      </div>
      <div>
        <Label className="font-semibold mb-2 block">Flutterwave Item Code</Label>
        <Input
          placeholder="e.g. MD107"
          value={form.providerCode}
          onChange={(e) => setForm(f => ({ ...f, providerCode: e.target.value }))}
          className="h-12 font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          This is the Flutterwave item_code for the data bundle. Use the browser below or check your Flutterwave dashboard.
        </p>
      </div>

      <FlwPlanBrowser
        network={plan?.network || form.network}
        onSelect={(code) => setForm(f => ({ ...f, providerCode: code }))}
      />

      <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
      </Button>
    </div>
  );
}

/** Reference card on the main page listing known FLW item codes */
function FlwReferenceCard() {
  const { toast } = useToast();
  const knownCodes: Array<{ network: string; code: string; desc: string; price: number }> = [
    { network: "MTN", code: "MD104", desc: "50MB", price: 100 },
    { network: "MTN", code: "MD105", desc: "150MB", price: 200 },
    { network: "MTN", code: "MD106", desc: "750MB", price: 500 },
    { network: "MTN", code: "MD107", desc: "1.5GB", price: 1000 },
    { network: "MTN", code: "MD108", desc: "3.5GB", price: 2000 },
    { network: "MTN", code: "MD109", desc: "5GB", price: 3500 },
    { network: "AIRTEL", code: "MD116", desc: "100MB", price: 100 },
    { network: "AIRTEL", code: "MD117", desc: "200MB", price: 200 },
    { network: "AIRTEL", code: "MD118", desc: "1GB", price: 500 },
    { network: "AIRTEL", code: "MD119", desc: "2GB", price: 1000 },
    { network: "AIRTEL", code: "MD120", desc: "5GB", price: 2000 },
    { network: "GLO", code: "MD110", desc: "100MB", price: 100 },
    { network: "GLO", code: "MD111", desc: "200MB", price: 200 },
    { network: "GLO", code: "MD112", desc: "1GB", price: 500 },
    { network: "GLO", code: "MD113", desc: "2GB", price: 1000 },
    { network: "9MOBILE", code: "MD127", desc: "100MB", price: 100 },
    { network: "9MOBILE", code: "MD128", desc: "500MB", price: 500 },
    { network: "9MOBILE", code: "MD129", desc: "1GB", price: 1000 },
  ];

  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? knownCodes : knownCodes.filter(c => c.network === filter);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink size={16} className="text-primary" />
            Known Flutterwave Item Codes
          </CardTitle>
          <p className="text-xs text-muted-foreground">Use these as <span className="font-mono font-bold">providerCode</span> when adding plans. Verify exact codes in your FLW dashboard.</p>
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          {["all", ...NETWORKS].map((n) => (
            <button
              key={n}
              onClick={() => setFilter(n)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${filter === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/30"}`}
            >
              {n === "all" ? "All" : n}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y max-h-60 overflow-y-auto rounded-b-lg">
          {filtered.map((c) => (
            <div key={c.code} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 text-sm">
              <Badge variant="outline" className={`text-xs font-bold ${NETWORK_COLORS[c.network]} border-0`}>
                {c.network}
              </Badge>
              <span className="font-mono font-bold text-primary w-16">{c.code}</span>
              <span className="text-muted-foreground flex-1">{c.desc}</span>
              <span className="font-semibold text-xs">≈ ₦{c.price.toLocaleString()}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  navigator.clipboard.writeText(c.code);
                  toast({ title: "Copied!", description: `${c.code} copied to clipboard` });
                }}
              >
                <Copy size={12} />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDataPlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [filterNetwork, setFilterNetwork] = useState("all");

  const { data = [], isLoading } = useAdminGetDataPlans({ query: { queryKey: getAdminGetDataPlansQueryKey() } });

  const deleteMutation = useAdminDeleteDataPlan({
    mutation: {
      onSuccess: () => {
        toast({ title: "Plan deleted" });
        queryClient.invalidateQueries({ queryKey: getAdminGetDataPlansQueryKey() });
      },
    },
  });

  const updateMutation = useAdminUpdateDataPlan({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminGetDataPlansQueryKey() }),
    },
  });

  const plans = filterNetwork === "all" ? (data as any[]) : (data as any[]).filter((p) => p.network === filterNetwork);
  const configuredCount = (data as any[]).filter((p: any) => p.providerCode).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Data Plans" description="Manage available data plans" />
        <Button onClick={() => { setDialogMode("create"); setEditPlan(null); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Plan
        </Button>
      </div>

      {configuredCount < (data as any[]).length && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>{(data as any[]).length - configuredCount} plan(s)</strong> are missing a Flutterwave item code — customers won't be able to purchase them. Edit each plan and set the <strong>providerCode</strong> to a valid FLW item_code (e.g. MD107 for MTN 1.5GB).
          </span>
        </div>
      )}

      <FlwReferenceCard />

      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", ...NETWORKS].map((n) => (
          <button
            key={n}
            onClick={() => setFilterNetwork(n)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              filterNetwork === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/30"
            }`}
          >
            {n === "all" ? "All Networks" : n}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Wifi className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No data plans found</p>
            </div>
          ) : (
            <div className="divide-y">
              {plans.map((plan: any) => (
                <div key={plan.id} className="p-4 flex items-center gap-4 flex-wrap">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${NETWORK_COLORS[plan.network] || "bg-muted"}`}>
                    {plan.network[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.size} · {plan.validity}</p>
                    {plan.providerCode ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={11} className="text-green-500" />
                        <span className="text-xs font-mono text-muted-foreground">{plan.providerCode}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertCircle size={11} className="text-amber-500" />
                        <span className="text-xs text-amber-600">No item code — set to enable delivery</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₦{plan.price?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Cost: ₦{plan.costPrice?.toLocaleString()}</p>
                  </div>
                  <Switch
                    checked={plan.isActive}
                    onCheckedChange={(v) => updateMutation.mutate({ id: plan.id, data: { isActive: v } as any })}
                  />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditPlan(plan); setDialogMode("edit"); }}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: plan.id })}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!dialogMode} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Edit Data Plan" : "Add New Data Plan"}</DialogTitle>
          </DialogHeader>
          <PlanForm plan={editPlan} onClose={() => setDialogMode(null)} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
