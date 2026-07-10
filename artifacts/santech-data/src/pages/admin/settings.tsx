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
  AlertCircle, Link, Eye, EyeOff, Crown, Lock,
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

type ProviderName = "kyb" | "bigisub" | "easyaccess";

type ProviderDef = {
  id: ProviderName;
  label: string;
  desc: string;
  fields: Array<{ credKey: string; label: string; hint: string }>;
};

const PROVIDERS: ProviderDef[] = [
  {
    id: "bigisub", label: "BigISub", desc: "bigisub.ng",
    fields: [
      { credKey: "bigisub_api_token", label: "API Token", hint: "Paste your BigISub API token from Settings → API Documentation" },
    ],
  },
  {
    id: "kyb", label: "KYB Data", desc: "kybdatassub.com.ng",
    fields: [{ credKey: "kybdata_api_token", label: "API Token", hint: "Paste your KYB Data API token" }],
  },
  {
    id: "easyaccess", label: "EasyAccess", desc: "easyaccess.com.ng",
    fields: [{ credKey: "easyaccess_api_token", label: "API Token", hint: "Paste your EasyAccess API token" }],
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
  provider, configured, verified: initVerified, onLink,
}: {
  provider: ProviderDef;
  configured: boolean;
  verified: boolean;
  onLink: (fields: Record<string, string>) => Promise<{ ok: boolean; message: string; balance?: number }>;
}) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(provider.fields.map((f) => [f.credKey, ""]))
  );
  const [linking, setLinking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; balance?: number } | null>(null);
  const [localVerified, setLocalVerified] = useState(initVerified);

  // Sync when parent reloads
  if (initVerified !== localVerified && result === null) setLocalVerified(initVerified);

  const isLinked = localVerified;
  const allFilled = provider.fields.every((f) => !!fieldValues[f.credKey]?.trim());

  const handleLink = async () => {
    if (!allFilled) return;
    setLinking(true);
    setResult(null);
    try {
      const trimmed = Object.fromEntries(Object.entries(fieldValues).map(([k, v]) => [k, v.trim()]));
      const r = await onLink(trimmed);
      setResult(r);
      setLocalVerified(r.ok);
      if (r.ok) setFieldValues(Object.fromEntries(provider.fields.map((f) => [f.credKey, ""])));
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${isLinked ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isLinked ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"}`}>
            {provider.label.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{provider.label}</p>
            <p className="text-xs text-slate-500">{provider.desc}</p>
          </div>
        </div>
        {isLinked
          ? <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] gap-1"><CheckCircle size={10} /> Linked</Badge>
          : <Badge variant="outline" className="text-slate-400 text-[10px] gap-1"><AlertCircle size={10} /> Not linked</Badge>
        }
      </div>

      <div className="space-y-2">
        {provider.fields.map((f) => (
          <FieldInput
            key={f.credKey}
            label={f.label}
            hint={isLinked ? `Update ${f.label}` : f.hint}
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
        {linking ? "Linking..." : isLinked ? "Update & Re-link" : "Link Provider"}
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
  const [resellerCommissionRate, setResellerCommissionRate] = useState("3");
  const [resellerPromoActive, setResellerPromoActive] = useState(false);
  const [resellerPromoEndDate, setResellerPromoEndDate] = useState("");

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [resellerPromoTitle, setResellerPromoTitle] = useState("Become a Reseller — Limited Offer!");
  const [resellerPromoText, setResellerPromoText] = useState("Activate your reseller account for just ₦500 and earn commission on every referral purchase. Offer ends soon!");

  // Custom provider
  const [customProviderName, setCustomProviderName] = useState("");
  const [customProviderUrl, setCustomProviderUrl] = useState("");
  const [customProviderToken, setCustomProviderToken] = useState("");
  const [customProviderSaving, setCustomProviderSaving] = useState(false);

  // Provider state
  const [configured, setConfigured] = useState<Record<string, boolean>>({ kyb: false, bigisub: false, easyaccess: false });
  const [verified, setVerified] = useState<Record<string, boolean>>({ kyb: false, bigisub: false, easyaccess: false });

  // Per-network / per-exam routing
  const [netProviders, setNetProviders] = useState<Record<string, string>>({
    MTN: "kyb", AIRTEL: "kyb", GLO: "kyb", "9MOBILE": "kyb",
  });
  const [examProviders, setExamProviders] = useState<Record<string, string>>({
    WAEC: "kyb", NECO: "kyb", JAMB: "kyb", NABTEB: "kyb",
  });
  const [electricityProvider, setElectricityProvider] = useState<string>("kyb");

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
    if (s.referralBonus)              setReferralBonus(s.referralBonus);
    if (s.minFunding)                 setMinFunding(s.minFunding);
    if (s.resellerCommissionRate)     setResellerCommissionRate(s.resellerCommissionRate);
    if (s.resellerPromoActive !== undefined) setResellerPromoActive(s.resellerPromoActive === "true");
    if (s.resellerPromoEndDate)       setResellerPromoEndDate(s.resellerPromoEndDate);
    if (s.resellerPromoTitle)         setResellerPromoTitle(s.resellerPromoTitle);
    if (s.resellerPromoText)          setResellerPromoText(s.resellerPromoText);

    if (s.custom_provider_name) setCustomProviderName(s.custom_provider_name);
    if (s.custom_provider_url)  setCustomProviderUrl(s.custom_provider_url);
    if (s.custom_provider_token) setCustomProviderToken(s.custom_provider_token);

    setConfigured({ kyb: s.kyb_configured === "true", bigisub: s.bigisub_configured === "true", easyaccess: s.easyaccess_configured === "true" });
    setVerified({ kyb: s.kyb_verified === "true", bigisub: s.bigisub_verified === "true", easyaccess: s.easyaccess_verified === "true" });
    setNetProviders({
      MTN:     s.net_provider_MTN     ?? "kyb",
      AIRTEL:  s.net_provider_AIRTEL  ?? "kyb",
      GLO:     s.net_provider_GLO     ?? "kyb",
      "9MOBILE": s["net_provider_9MOBILE"] ?? "kyb",
    });
    setExamProviders({
      WAEC:   s.exam_provider_WAEC   ?? "kyb",
      NECO:   s.exam_provider_NECO   ?? "kyb",
      JAMB:   s.exam_provider_JAMB   ?? "kyb",
      NABTEB: s.exam_provider_NABTEB ?? "kyb",
    });
    setElectricityProvider(s.elec_provider ?? "kyb");
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

  const handleSaveCustomProvider = async () => {
    if (!customProviderName.trim() && !customProviderUrl.trim() && !customProviderToken.trim()) {
      toast({ title: "Nothing to save", description: "Fill in at least one field.", variant: "destructive" }); return;
    }
    setCustomProviderSaving(true);
    try {
      await patchSettings({
        custom_provider_name: customProviderName,
        custom_provider_url: customProviderUrl,
        custom_provider_token: customProviderToken,
      });
      toast({ title: "Custom provider saved!" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setCustomProviderSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      toast({ title: "All password fields are required", variant: "destructive" }); return;
    }
    if (pwdNew.length < 8) {
      toast({ title: "New password must be at least 8 characters", variant: "destructive" }); return;
    }
    if (pwdNew !== pwdConfirm) {
      toast({ title: "New passwords do not match", variant: "destructive" }); return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast({ title: "Password changed successfully" });
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
    } catch (e: any) {
      toast({ title: "Failed to change password", description: e.message, variant: "destructive" });
    } finally {
      setPwdSaving(false);
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
        referralBonus, minFunding, resellerCommissionRate,
        resellerPromoActive: String(resellerPromoActive),
        resellerPromoEndDate, resellerPromoTitle, resellerPromoText,
        custom_provider_name: customProviderName,
        custom_provider_url: customProviderUrl,
        ...Object.fromEntries(Object.entries(netProviders).map(([k, v]) => [`net_provider_${k}`, v])),
        ...Object.fromEntries(Object.entries(examProviders).map(([k, v]) => [`exam_provider_${k}`, v])),
        elec_provider: electricityProvider,
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
              <ProviderCard key={p.id} provider={p} configured={!!configured[p.id]} verified={!!verified[p.id]} onLink={handleLink} />
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

        {/* Custom / Free Provider */}
        <SectionCard icon={Link} title="Custom / Free Provider">
          <p className="text-xs text-slate-500 -mt-1">
            Got a new API? Enter its name and base URL here to save it for future integration.
          </p>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Provider Name</Label>
            <Input
              value={customProviderName}
              onChange={(e) => setCustomProviderName(e.target.value)}
              placeholder="e.g. FreeMobileAPI, NigeriaVTU, MyDataPro"
              className="h-10"
            />
            <p className="text-xs text-slate-400 mt-1">Give it any name you like — this is just for your reference.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Base URL</Label>
            <Input
              value={customProviderUrl}
              onChange={(e) => setCustomProviderUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="h-10"
            />
            <p className="text-xs text-slate-400 mt-1">The root endpoint of the provider's API.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">API Token / Key</Label>
            <Input
              type="password"
              value={customProviderToken}
              onChange={(e) => setCustomProviderToken(e.target.value)}
              placeholder="Paste your API token or key"
              className="h-10"
            />
            <p className="text-xs text-slate-400 mt-1">Stored securely. Share the API docs with us to complete the integration.</p>
          </div>
          <Button onClick={handleSaveCustomProvider} disabled={customProviderSaving} className="w-full">
            {customProviderSaving
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              : <><Save className="h-4 w-4 mr-2" />Save Custom Provider</>}
          </Button>
          {customProviderName && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
              <CheckCircle size={13} className="shrink-0" />
              <span><strong>{customProviderName}</strong> is saved{customProviderUrl ? ` — ${customProviderUrl}` : ""}.</span>
            </div>
          )}
        </SectionCard>

        {/* Provider Routing */}
        <SectionCard icon={ArrowRightLeft} title="Provider Routing">
          <p className="text-xs text-slate-500 -mt-1">
            Choose which provider handles each network and exam type. Click <strong>Save Changes</strong> to apply.
          </p>

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile Networks</p>
            <div className="space-y-2">
              {(["MTN", "AIRTEL", "GLO", "9MOBILE"] as const).map((net) => (
                <div key={net} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-sm font-bold text-slate-700">{net}</span>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[11px] font-semibold">
                    {(["kyb", "bigisub", "easyaccess"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNetProviders((prev) => ({ ...prev, [net]: p }))}
                        className={`px-3 py-1.5 transition-colors ${netProviders[net] === p ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                      >
                        {p === "kyb" ? "KYB Data" : p === "bigisub" ? "BigISub" : "EasyAccess"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              EasyAccess doesn't support airtime top-ups — airtime for a network set to EasyAccess automatically uses your backup provider instead. Data still goes through EasyAccess.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Exam Pins</p>
            <div className="space-y-2">
              {(["WAEC", "NECO", "JAMB", "NABTEB"] as const).map((exam) => (
                <div key={exam} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-sm font-bold text-slate-700">{exam}</span>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[11px] font-semibold">
                    {(exam === "JAMB" ? (["kyb", "bigisub"] as const) : (["kyb", "bigisub", "easyaccess"] as const)).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setExamProviders((prev) => ({ ...prev, [exam]: p }))}
                        className={`px-3 py-1.5 transition-colors ${examProviders[exam] === p ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                      >
                        {p === "kyb" ? "KYB Data" : p === "bigisub" ? "BigISub" : "EasyAccess"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">EasyAccess doesn't support JAMB pins, so it isn't offered as an option for JAMB.</p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Electricity</p>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-sm font-bold text-slate-700">All Discos</span>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[11px] font-semibold">
                {(["kyb", "bigisub", "easyaccess"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setElectricityProvider(p)}
                    className={`px-3 py-1.5 transition-colors ${electricityProvider === p ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                  >
                    {p === "kyb" ? "KYB Data" : p === "bigisub" ? "BigISub" : "EasyAccess"}
                  </button>
                ))}
              </div>
            </div>
          </div>
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

        {/* Reseller Promo Banner */}
        <SectionCard icon={Crown} title="Reseller Promo Banner">
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">Show promo banner to customers</p>
              <p className="text-xs text-slate-500">Displays on dashboard for non-resellers only</p>
            </div>
            <Switch checked={resellerPromoActive} onCheckedChange={setResellerPromoActive} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Offer End Date</Label>
            <Input type="date" value={resellerPromoEndDate} onChange={(e) => setResellerPromoEndDate(e.target.value)} className="h-10" />
            <p className="text-xs text-slate-400 mt-1">A countdown timer will show on the banner. Leave blank for no countdown.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Banner Title</Label>
            <Input value={resellerPromoTitle} onChange={(e) => setResellerPromoTitle(e.target.value)} placeholder="Become a Reseller — Limited Offer!" className="h-10" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Banner Text</Label>
            <Textarea value={resellerPromoText} onChange={(e) => setResellerPromoText(e.target.value)}
              placeholder="Activate your reseller account for just ₦500 and earn commission on every referral purchase."
              className="resize-none min-h-[70px] text-sm" />
          </div>
          {resellerPromoActive && (
            <div className="rounded-xl overflow-hidden border border-indigo-200">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide px-3 pt-2 pb-1 bg-indigo-50">Preview</p>
              <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Crown size={18} className="text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight truncate">{resellerPromoTitle || "Become a Reseller — Limited Offer!"}</p>
                  <p className="text-[11px] text-blue-200 leading-tight mt-0.5 line-clamp-1">{resellerPromoText || "Activate for just ₦500…"}</p>
                </div>
                {resellerPromoEndDate && (
                  <div className="text-center shrink-0">
                    <p className="text-lg font-black leading-none">{Math.max(0, Math.ceil((new Date(resellerPromoEndDate).getTime() - Date.now()) / 86400000))}</p>
                    <p className="text-[9px] text-blue-200 uppercase tracking-wide">days left</p>
                  </div>
                )}
              </div>
            </div>
          )}
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

        {/* Change Password */}
        <SectionCard icon={Lock} title="Change Admin Password">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Current Password</Label>
            <Input
              type="password"
              value={pwdCurrent}
              onChange={(e) => setPwdCurrent(e.target.value)}
              placeholder="Enter your current password"
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">New Password</Label>
            <Input
              type="password"
              value={pwdNew}
              onChange={(e) => setPwdNew(e.target.value)}
              placeholder="Minimum 8 characters"
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Confirm New Password</Label>
            <Input
              type="password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              placeholder="Repeat your new password"
              className="h-10"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={pwdSaving} className="w-full">
            {pwdSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Changing...</> : <><Lock className="h-4 w-4 mr-2" />Change Password</>}
          </Button>
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
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reseller Commission Rate (%)</Label>
            <Input type="number" min="0" max="50" step="0.5" value={resellerCommissionRate} onChange={(e) => setResellerCommissionRate(e.target.value)} placeholder="3" className="h-10" />
            <p className="text-xs text-slate-400 mt-1">Percentage of each purchase credited to the referring reseller. Default: 3%.</p>
          </div>
        </SectionCard>

      </div>
    </AdminLayout>
  );
}
