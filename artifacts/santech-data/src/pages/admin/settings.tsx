import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Mail, CreditCard, Megaphone, Save, Loader2,
  ArrowRightLeft, BookOpen, RefreshCw, Bug, CheckCircle,
  AlertCircle, Link, Zap, Eye, EyeOff,
} from "lucide-react";

const API = "/api/admin/settings";
const token = () => sessionStorage.getItem("santech_token") ?? "";

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch(API, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) return {};
  return res.json();
}

async function patchSettings(data: Record<string, string>): Promise<void> {
  const res = await fetch(API, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save");
}

async function callAdminAction(path: string): Promise<any> {
  const res = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token()}` } });
  return res.json();
}

type ProviderName = "kyb" | "husmodata" | "gsubz";
const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"] as const;
const PROVIDERS: Array<{ id: ProviderName; label: string; desc: string; credKey: string; credLabel: string }> = [
  { id: "kyb",       label: "KYB Data",  desc: "kybdatassub.com.ng",  credKey: "kybdata_api_token", credLabel: "API Token" },
  { id: "husmodata", label: "Husmodata", desc: "husmodata.com",        credKey: "husmodata_api_key", credLabel: "API Key"   },
  { id: "gsubz",     label: "Gsubz",     desc: "gsubz.com",            credKey: "gsubz_api_key",     credLabel: "API Key"   },
];

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Icon size={14} className="text-blue-600" />
          </div>
          <CardTitle className="text-sm font-bold text-slate-800">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">{children}</CardContent>
    </Card>
  );
}

function ProviderCard({
  provider, configured, onLink,
}: {
  provider: typeof PROVIDERS[0];
  configured: boolean;
  onLink: (key: string, value: string) => Promise<{ ok: boolean; message: string; balance?: number }>;
}) {
  const [cred, setCred] = useState("");
  const [show, setShow] = useState(false);
  const [linking, setLinking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; balance?: number } | null>(null);

  const handleLink = async () => {
    if (!cred.trim()) return;
    setLinking(true);
    setResult(null);
    try {
      const r = await onLink(provider.credKey, cred.trim());
      setResult(r);
      if (r.ok) setCred("");
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${configured ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${configured ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"}`}>
            {provider.label.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{provider.label}</p>
            <p className="text-xs text-slate-500">{provider.desc}</p>
          </div>
        </div>
        {configured
          ? <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] gap-1"><CheckCircle size={10} /> Linked</Badge>
          : <Badge variant="outline" className="text-slate-400 text-[10px] gap-1"><AlertCircle size={10} /> Not linked</Badge>
        }
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={cred}
            onChange={(e) => setCred(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLink()}
            placeholder={configured ? `Update ${provider.credLabel}` : `Paste your ${provider.credLabel}`}
            className="h-9 text-sm pr-9 font-mono"
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <Button size="sm" onClick={handleLink} disabled={!cred.trim() || linking} className="h-9 px-4 gap-1.5 text-xs">
          {linking ? <Loader2 size={12} className="animate-spin" /> : <Link size={12} />}
          {linking ? "Linking..." : "Link"}
        </Button>
      </div>

      {result && (
        <div className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${result.ok ? "text-green-600" : "text-red-500"}`}>
          {result.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          {result.message}
          {result.balance !== undefined && ` — Balance: ₦${result.balance.toLocaleString()}`}
        </div>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seedingExams, setSeedingExams] = useState(false);
  const [testingMonnify, setTestingMonnify] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [supportEmail, setSupportEmail] = useState("santechdata@gmail.com");
  const [supportPhone, setSupportPhone] = useState("09026329296");
  const [whatsapp, setWhatsapp] = useState("09026329296");
  const [announcement, setAnnouncement] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [paystackActive, setPaystackActive] = useState(true);
  const [monnifyActive, setMonnifyActive] = useState(true);
  const [airtimeToCashActive, setAirtimeToCashActive] = useState(true);
  const [bankTransferActive, setBankTransferActive] = useState(false);
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [referralBonus, setReferralBonus] = useState("200");
  const [minFunding, setMinFunding] = useState("100");

  const [configured, setConfigured] = useState<Record<string, boolean>>({ kyb: false, husmodata: false, gsubz: false });
  const [networkMap, setNetworkMap] = useState<Record<string, ProviderName>>({ MTN: "kyb", AIRTEL: "kyb", GLO: "kyb", "9MOBILE": "kyb" });
  const [savingNetwork, setSavingNetwork] = useState<string | null>(null);

  const reload = async () => {
    const s = await fetchSettings();
    if (s.supportEmail) setSupportEmail(s.supportEmail);
    if (s.supportPhone) setSupportPhone(s.supportPhone);
    if (s.whatsapp) setWhatsapp(s.whatsapp);
    if (s.announcement) setAnnouncement(s.announcement);
    if (s.announcementActive !== undefined) setAnnouncementActive(s.announcementActive === "true");
    if (s.paystackActive !== undefined) setPaystackActive(s.paystackActive === "true");
    if (s.monnifyActive !== undefined) setMonnifyActive(s.monnifyActive === "true");
    if (s.airtimeToCashActive !== undefined) setAirtimeToCashActive(s.airtimeToCashActive === "true");
    if (s.bankTransferActive !== undefined) setBankTransferActive(s.bankTransferActive === "true");
    if (s.bankAccountNumber) setBankAccountNumber(s.bankAccountNumber);
    if (s.bankAccountName) setBankAccountName(s.bankAccountName);
    if (s.bankName) setBankName(s.bankName);
    if (s.referralBonus) setReferralBonus(s.referralBonus);
    if (s.minFunding) setMinFunding(s.minFunding);
    setConfigured({ kyb: s.kyb_configured === "true", husmodata: s.husmodata_configured === "true", gsubz: s.gsubz_configured === "true" });
    setNetworkMap({
      MTN:      (s["net_provider_MTN"]     ?? s.activeProvider ?? "kyb") as ProviderName,
      AIRTEL:   (s["net_provider_AIRTEL"]  ?? s.activeProvider ?? "kyb") as ProviderName,
      GLO:      (s["net_provider_GLO"]     ?? s.activeProvider ?? "kyb") as ProviderName,
      "9MOBILE":(s["net_provider_9MOBILE"] ?? s.activeProvider ?? "kyb") as ProviderName,
    });
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const handleLink = async (credKey: string, value: string) => {
    try {
      await patchSettings({ [credKey]: value });
      const providerId = PROVIDERS.find((p) => p.credKey === credKey)?.id ?? "kyb";
      // Test connection
      const testRes = await fetch(`/api/admin/link-provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ provider: providerId }),
      });
      const r = await testRes.json();
      // Refresh statuses
      await reload();
      return r as { ok: boolean; message: string; balance?: number };
    } catch {
      return { ok: false, message: "Failed to link — please try again" };
    }
  };

  const handleNetworkChange = async (network: string, provider: ProviderName) => {
    setSavingNetwork(network);
    try {
      await patchSettings({ [`net_provider_${network}`]: provider });
      setNetworkMap((prev) => ({ ...prev, [network]: provider }));
      toast({ title: `${network} → ${PROVIDERS.find((p) => p.id === provider)?.label}`, description: "Purchases for this network will now use this provider." });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSavingNetwork(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await patchSettings({
        supportEmail, supportPhone, whatsapp, announcement,
        announcementActive: String(announcementActive),
        paystackActive: String(paystackActive),
        monnifyActive: String(monnifyActive),
        airtimeToCashActive: String(airtimeToCashActive),
        bankTransferActive: String(bankTransferActive),
        bankAccountNumber, bankAccountName, bankName,
        referralBonus, minFunding,
      });
      toast({ title: "Settings saved!" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  const linkedProviders = PROVIDERS.filter((p) => configured[p.id]);

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Settings" description="Configure your SanTech Data platform" />
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-5 max-w-xl">

        {/* VTU Providers — Link */}
        <SectionCard icon={Link} title="VTU Providers">
          <p className="text-xs text-slate-500 -mt-1">
            Paste your API key for each provider and press <strong>Link</strong> to connect instantly.
          </p>
          <div className="space-y-3">
            {PROVIDERS.map((p) => (
              <ProviderCard key={p.id} provider={p} configured={!!configured[p.id]} onLink={handleLink} />
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={async () => {
              setSyncing(true);
              try {
                const r = await callAdminAction("/api/admin/sync-kyb-plans");
                if (r.errors?.length) toast({ title: "Sync error", description: r.errors[0], variant: "destructive" });
                else toast({ title: "Plans synced!", description: `+${r.added} added · ${r.updated} updated · ${r.deactivated} removed` });
              } catch { toast({ title: "Sync failed", variant: "destructive" }); }
              finally { setSyncing(false); }
            }} disabled={syncing} className="gap-2">
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {syncing ? "Syncing..." : "Sync KYB Plans"}
            </Button>
          </div>
        </SectionCard>

        {/* Network Routing */}
        <SectionCard icon={Zap} title="Network Routing">
          <p className="text-xs text-slate-500 -mt-1">
            Choose which provider handles each network. Link a provider above first to make it available here.
          </p>
          {linkedProviders.length === 0 && (
            <div className="text-center py-4 text-xs text-slate-400">
              No providers linked yet. Link at least one above to configure routing.
            </div>
          )}
          {linkedProviders.length > 0 && (
            <div className="space-y-2">
              {NETWORKS.map((net) => (
                <div key={net} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-600">{net === "9MOBILE" ? "9M" : net.slice(0, 3)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{net}</p>
                      <p className="text-xs text-slate-400">Data & Airtime</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingNetwork === net && <Loader2 size={13} className="animate-spin text-blue-500" />}
                    <Select
                      value={networkMap[net] ?? "kyb"}
                      onValueChange={(v) => handleNetworkChange(net, v as ProviderName)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {linkedProviders.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Exam Types */}
        <SectionCard icon={BookOpen} title="Exam Types">
          <p className="text-xs text-slate-500 -mt-1">Ensure WAEC, NECO, JAMB and NABTEB are available for customers.</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {["WAEC", "NECO", "JAMB", "NABTEB"].map((code) => (
              <div key={code} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <p className="font-bold text-xs text-slate-700">{code}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={async () => {
            setSeedingExams(true);
            try {
              const r = await callAdminAction("/api/admin/seed-exam-types");
              toast({ title: "Exam types synced", description: r.message });
            } catch { toast({ title: "Sync failed", variant: "destructive" }); }
            finally { setSeedingExams(false); }
          }} disabled={seedingExams} className="gap-2">
            {seedingExams ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {seedingExams ? "Syncing..." : "Sync Exam Types"}
          </Button>
        </SectionCard>

        {/* Payment Gateways */}
        <SectionCard icon={CreditCard} title="Payment Gateways">
          <p className="text-xs text-slate-500 -mt-1">Choose which gateways customers can use to fund their wallets.</p>
          {[
            { label: "Paystack", desc: "Cards, Bank Transfer, USSD", value: paystackActive, set: setPaystackActive },
            { label: "Monnify",  desc: "Bank Transfer, USSD",        value: monnifyActive,  set: setMonnifyActive  },
          ].map(({ label, desc, value, set }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <Switch checked={value} onCheckedChange={set} />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={async () => {
            setTestingMonnify(true);
            try {
              const r = await callAdminAction("/api/admin/debug-monnify");
              if (r.authSuccess) toast({ title: "Monnify OK ✓", description: `Auth successful on ${r.baseUrl}` });
              else toast({ title: "Monnify issue", description: r.error ?? JSON.stringify(r.response), variant: "destructive" });
            } catch { toast({ title: "Test failed", variant: "destructive" }); }
            finally { setTestingMonnify(false); }
          }} disabled={testingMonnify} className="gap-2">
            {testingMonnify ? <Loader2 size={13} className="animate-spin" /> : <Bug size={13} />}
            {testingMonnify ? "Testing..." : "Test Monnify"}
          </Button>
        </SectionCard>

        {/* Bank Transfer */}
        <SectionCard icon={CreditCard} title="Manual Bank Transfer">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">Enable bank transfer option</p>
              <p className="text-xs text-slate-500 mt-0.5">Customers will see your account number to transfer manually</p>
            </div>
            <Switch checked={bankTransferActive} onCheckedChange={setBankTransferActive} />
          </div>
          {bankTransferActive && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Bank Name</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Opay, GTBank" className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Account Number</Label>
                <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="e.g. 8012345678" className="h-10 font-mono" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Account Name</Label>
                <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="e.g. SanTech Data" className="h-10" />
              </div>
            </div>
          )}
        </SectionCard>

        {/* Airtime to Cash */}
        <SectionCard icon={ArrowRightLeft} title="Airtime to Cash">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">Allow customer submissions</p>
              <p className="text-xs text-slate-500 mt-0.5">Turn off to temporarily stop new requests</p>
            </div>
            <Switch checked={airtimeToCashActive} onCheckedChange={setAirtimeToCashActive} />
          </div>
        </SectionCard>

        {/* Announcement */}
        <SectionCard icon={Megaphone} title="Announcement Banner">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">Show banner to all customers</p>
              <p className="text-xs text-slate-500">Displays on the customer dashboard</p>
            </div>
            <Switch checked={announcementActive} onCheckedChange={setAnnouncementActive} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Message</Label>
            <Textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g. Service is running smoothly. Enjoy fast data delivery!"
              className="resize-none min-h-[80px] text-sm" />
          </div>
        </SectionCard>

        {/* Contact */}
        <SectionCard icon={Mail} title="Contact & Support">
          {[
            { label: "Support Email", value: supportEmail, set: setSupportEmail, placeholder: "support@yourdomain.com" },
            { label: "Support Phone", value: supportPhone, set: setSupportPhone, placeholder: "09026329296" },
            { label: "WhatsApp Number", value: whatsapp, set: setWhatsapp, placeholder: "09026329296" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</Label>
              <Input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className="h-10" />
            </div>
          ))}
        </SectionCard>

        {/* Wallet Settings */}
        <SectionCard icon={Settings} title="Wallet Settings">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Minimum Funding Amount (₦)</Label>
            <Input type="number" value={minFunding} onChange={(e) => setMinFunding(e.target.value)} placeholder="100" className="h-10" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Referral Bonus (₦)</Label>
            <Input type="number" value={referralBonus} onChange={(e) => setReferralBonus(e.target.value)} placeholder="200" className="h-10" />
            <p className="text-xs text-slate-400 mt-1">Credited to both users when a referral funds their wallet for the first time.</p>
          </div>
        </SectionCard>

      </div>
    </AdminLayout>
  );
}
