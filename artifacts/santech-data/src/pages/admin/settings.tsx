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
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Mail, CreditCard, Megaphone, Save, Loader2,
  ArrowRightLeft, BookOpen, RefreshCw, Bug, CheckCircle,
  AlertCircle, Link, Eye, EyeOff,
} from "lucide-react";

const API = "/api/admin/settings";
const tok = () => sessionStorage.getItem("santech_token") ?? "";

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch(API, { headers: { Authorization: `Bearer ${tok()}` } });
  if (!res.ok) return {};
  return res.json();
}

async function patchSettings(data: Record<string, string>): Promise<void> {
  const res = await fetch(API, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save");
}

async function adminPost(path: string, body?: unknown): Promise<any> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

type ProviderName = "kyb" | "bigisub";

type ProviderDef = {
  id: ProviderName;
  label: string;
  desc: string;
  fields: Array<{ credKey: string; label: string; hint: string }>;
};

const PROVIDERS: ProviderDef[] = [
  {
    id: "bigisub", label: "BigISub", desc: "bigisub.ng",
    fields: [{ credKey: "bigisub_api_token", label: "API Token", hint: "Paste your BigISub API token" }],
  },
  {
    id: "kyb", label: "KYB Data", desc: "kybdatassub.com.ng",
    fields: [{ credKey: "kybdata_api_token", label: "API Token", hint: "Paste your KYB Data API token" }],
  },
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

function FieldInput({ label, hint, value, onChange, onEnter }: {
  label: string; hint: string; value: string;
  onChange: (v: string) => void; onEnter?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={hint}
          className="h-9 text-sm pr-9 font-mono"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );
}

function ProviderCard({
  provider, configured, onLink,
}: {
  provider: ProviderDef;
  configured: boolean;
  onLink: (fields: Record<string, string>) => Promise<{ ok: boolean; message: string; balance?: number }>;
}) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(provider.fields.map((f) => [f.credKey, ""]))
  );
  const [linking, setLinking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; balance?: number } | null>(null);

  const allFilled = provider.fields.every((f) => !!fieldValues[f.credKey]?.trim());

  const handleLink = async () => {
    if (!allFilled) return;
    setLinking(true);
    setResult(null);
    try {
      const trimmed = Object.fromEntries(Object.entries(fieldValues).map(([k, v]) => [k, v.trim()]));
      const r = await onLink(trimmed);
      setResult(r);
      if (r.ok) setFieldValues(Object.fromEntries(provider.fields.map((f) => [f.credKey, ""])));
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

      <div className="space-y-2">
        {provider.fields.map((f) => (
          <FieldInput
            key={f.credKey}
            label={f.label}
            hint={configured ? `Update ${f.label}` : f.hint}
            value={fieldValues[f.credKey] ?? ""}
            onChange={(v) => setFieldValues((prev) => ({ ...prev, [f.credKey]: v }))}
            onEnter={provider.fields.indexOf(f) === provider.fields.length - 1 ? handleLink : undefined}
          />
        ))}
      </div>

      <Button
        size="sm"
        onClick={handleLink}
        disabled={!allFilled || linking}
        className="mt-3 h-9 px-4 gap-1.5 text-xs w-full"
      >
        {linking ? <Loader2 size={12} className="animate-spin" /> : <Link size={12} />}
        {linking ? "Linking..." : configured ? "Update & Re-link" : "Link Provider"}
      </Button>

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

  // General settings
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

  // Provider state
  const [configured, setConfigured] = useState<Record<string, boolean>>({ kyb: false, bigisub: false });

  const reload = async () => {
    const s = await fetchSettings();
    if (s.supportEmail)         setSupportEmail(s.supportEmail);
    if (s.supportPhone)         setSupportPhone(s.supportPhone);
    if (s.whatsapp)             setWhatsapp(s.whatsapp);
    if (s.announcement)         setAnnouncement(s.announcement);
    if (s.announcementActive !== undefined) setAnnouncementActive(s.announcementActive === "true");
    if (s.paystackActive !== undefined) setPaystackActive(s.paystackActive === "true");
    if (s.monnifyActive !== undefined)  setMonnifyActive(s.monnifyActive === "true");
    if (s.airtimeToCashActive !== undefined) setAirtimeToCashActive(s.airtimeToCashActive === "true");
    if (s.bankTransferActive !== undefined)  setBankTransferActive(s.bankTransferActive === "true");
    if (s.bankAccountNumber)    setBankAccountNumber(s.bankAccountNumber);
    if (s.bankAccountName)      setBankAccountName(s.bankAccountName);
    if (s.bankName)             setBankName(s.bankName);
    if (s.referralBonus)        setReferralBonus(s.referralBonus);
    if (s.minFunding)           setMinFunding(s.minFunding);

    setConfigured({ kyb: s.kyb_configured === "true", bigisub: s.bigisub_configured === "true" });
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const handleLink = async (fields: Record<string, string>) => {
    try {
      await patchSettings(fields);
      const providerId = PROVIDERS.find((p) => p.fields.some((f) => f.credKey in fields))?.id ?? "kyb";
      const r = await adminPost("/api/admin/link-provider", { provider: providerId });
      await reload();
      return r as { ok: boolean; message: string; balance?: number };
    } catch {
      return { ok: false, message: "Failed to link — please try again" };
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

        {/* VTU Providers */}
        <SectionCard icon={Link} title="VTU Providers">
          <p className="text-xs text-slate-500 -mt-1">
            Fill in your credentials and press <strong>Link Provider</strong> to connect instantly.
          </p>
          <div className="space-y-3">
            {PROVIDERS.map((p) => (
              <ProviderCard key={p.id} provider={p} configured={!!configured[p.id]} onLink={handleLink} />
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={async () => {
            setSyncing(true);
            try {
              const r = await adminPost("/api/admin/sync-kyb-plans");
              if (r.errors?.length) toast({ title: "Sync error", description: r.errors[0], variant: "destructive" });
              else toast({ title: "Plans synced!", description: `+${r.added} added · ${r.updated} updated · ${r.deactivated} removed` });
            } catch { toast({ title: "Sync failed", variant: "destructive" }); }
            finally { setSyncing(false); }
          }} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {syncing ? "Syncing..." : "Sync KYB Plans"}
          </Button>
        </SectionCard>

        {/* Exam Types */}
        <SectionCard icon={BookOpen} title="Available Exam Types">
          <p className="text-xs text-slate-500 -mt-1">Ensure these are seeded in the database for customers to purchase.</p>
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
              const r = await adminPost("/api/admin/seed-exam-types");
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
              const r = await adminPost("/api/admin/debug-monnify");
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
            { label: "Support Email",   value: supportEmail, set: setSupportEmail, placeholder: "support@yourdomain.com" },
            { label: "Support Phone",   value: supportPhone, set: setSupportPhone, placeholder: "09026329296" },
            { label: "WhatsApp Number", value: whatsapp,     set: setWhatsapp,     placeholder: "09026329296" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</Label>
              <Input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className="h-10" />
            </div>
          ))}
        </SectionCard>

        {/* Wallet */}
        <SectionCard icon={Settings} title="Wallet Settings">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Minimum Funding Amount (₦)</Label>
            <Input type="number" value={minFunding} onChange={(e) => setMinFunding(e.target.value)} placeholder="100" className="h-10" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Referral Bonus (₦)</Label>
            <Input type="number" value={referralBonus} onChange={(e) => setReferralBonus(e.target.value)} placeholder="200" className="h-10" />
            <p className="text-xs text-slate-400 mt-1">Credited when a referral funds their wallet for the first time.</p>
          </div>
        </SectionCard>

      </div>
    </AdminLayout>
  );
}
