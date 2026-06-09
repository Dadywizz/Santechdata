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
import { Settings, Mail, CreditCard, Megaphone, Save, Loader2, Zap, ArrowRightLeft, Key, BookOpen, RefreshCw, Bug, Phone } from "lucide-react";

const API = "/api/admin/settings";

async function fetchSettings(): Promise<Record<string, string>> {
  const token = localStorage.getItem("santech_token");
  const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return {};
  return res.json();
}

async function saveSettings(data: Record<string, string>): Promise<void> {
  const token = localStorage.getItem("santech_token");
  const res = await fetch(API, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save settings");
}

async function callAdminAction(path: string): Promise<any> {
  const token = localStorage.getItem("santech_token");
  const res = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

type Provider = "easyaccess" | "clubkonnect" | "vtpass";

const PROVIDER_LABELS: Record<Provider, string> = {
  easyaccess: "EasyAccess",
  clubkonnect: "Clubkonnect",
  vtpass: "VTpass",
};

function ProviderToggle({
  label, icon: Icon, current, onChange, options,
}: {
  label: string;
  icon: React.ElementType;
  current: Provider;
  onChange: (v: Provider) => void;
  options: Provider[];
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-primary" />
        <div>
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active: <span className="font-medium text-foreground">{PROVIDER_LABELS[current]}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              current === opt
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {PROVIDER_LABELS[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seedingExams, setSeedingExams] = useState(false);
  const [testingMonnify, setTestingMonnify] = useState(false);

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

  // VTU provider API keys
  const [easyAccessToken, setEasyAccessToken] = useState("");
  const [showEaToken, setShowEaToken] = useState(false);

  // Per-service provider selection
  const [airtimeProvider, setAirtimeProvider] = useState<Provider>("clubkonnect");
  const [dataProvider, setDataProvider] = useState<Provider>("easyaccess");
  const [electricityProvider, setElectricityProvider] = useState<Provider>("easyaccess");
  const [cableProvider, setCableProvider] = useState<Provider>("easyaccess");
  const [examProvider, setExamProvider] = useState<Provider>("easyaccess");

  useEffect(() => {
    fetchSettings().then((s) => {
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
      if (s.easyaccess_api_token) setEasyAccessToken(s.easyaccess_api_token);
      if (s.airtimeProvider) setAirtimeProvider(s.airtimeProvider as Provider);
      if (s.dataProvider) setDataProvider(s.dataProvider as Provider);
      if (s.electricityProvider) setElectricityProvider(s.electricityProvider as Provider);
      if (s.cableProvider) setCableProvider(s.cableProvider as Provider);
      if (s.examProvider) setExamProvider(s.examProvider as Provider);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        supportEmail, supportPhone, whatsapp, announcement,
        announcementActive: String(announcementActive),
        paystackActive: String(paystackActive),
        monnifyActive: String(monnifyActive),
        airtimeToCashActive: String(airtimeToCashActive),
        bankTransferActive: String(bankTransferActive),
        bankAccountNumber, bankAccountName, bankName,
        referralBonus, minFunding,
        airtimeProvider, dataProvider, electricityProvider, cableProvider, examProvider,
      };
      if (easyAccessToken) payload.easyaccess_api_token = easyAccessToken;
      await saveSettings(payload);
      toast({ title: "Settings saved!", description: "All changes applied — provider changes active immediately." });
    } catch {
      toast({ title: "Failed to save", description: "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSeedExams = async () => {
    setSeedingExams(true);
    try {
      const result = await callAdminAction("/api/admin/seed-exam-types");
      toast({ title: "Exam types synced", description: result.message ?? `${result.added} type(s) added` });
    } catch {
      toast({ title: "Sync failed", description: "Please try again", variant: "destructive" });
    } finally {
      setSeedingExams(false);
    }
  };

  const handleTestMonnify = async () => {
    setTestingMonnify(true);
    try {
      const result = await callAdminAction("/api/admin/debug-monnify");
      if (result.authSuccess) {
        toast({ title: "Monnify OK ✓", description: `Auth successful on ${result.baseUrl}` });
      } else {
        toast({ title: "Monnify connection issue", description: result.error ?? JSON.stringify(result.response), variant: "destructive" });
      }
    } catch {
      toast({ title: "Test failed", variant: "destructive" });
    } finally {
      setTestingMonnify(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="App Settings" description="Configure your SanTech Data platform" />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <div className="space-y-6 max-w-2xl">

        {/* VTU Provider API Keys */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Key className="text-primary" size={18} />
              <CardTitle className="text-base">VTU Provider API Keys</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Update your provider credentials here. Changes take effect immediately — no server restart needed.
            </p>

            {/* EasyAccess */}
            <div className="p-4 rounded-lg border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-primary" />
                <p className="font-semibold text-sm">EasyAccess API Token</p>
                <Badge variant="outline" className="text-[10px]">Data · Electricity · Cable · Exam</Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  type={showEaToken ? "text" : "password"}
                  value={easyAccessToken}
                  onChange={(e) => setEasyAccessToken(e.target.value)}
                  placeholder="Paste your EasyAccess Bearer token"
                  className="h-11 font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={() => setShowEaToken((v) => !v)} className="shrink-0 px-3">
                  {showEaToken ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Stored securely in the database. Overrides the environment variable immediately on save.
              </p>
            </div>

            {/* Clubkonnect */}
            <div className="p-4 rounded-lg border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-blue-600" />
                <p className="font-semibold text-sm">Clubkonnect</p>
                <Badge className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0">Airtime</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Clubkonnect handles <strong>airtime purchases</strong>. Credentials are set via environment variables:
              </p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: "CLUBKONNECT_PHONE", hint: "Your registered phone" },
                  { label: "CLUBKONNECT_APIKEY", hint: "API key from dashboard" },
                  { label: "CLUBKONNECT_PASSWORD", hint: "Login password" },
                ].map((cred) => (
                  <div key={cred.label} className="p-2 rounded bg-muted/60 text-center">
                    <p className="text-[10px] font-mono font-bold text-foreground leading-tight">{cred.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{cred.hint}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                To update Clubkonnect credentials, ask your platform admin to update the environment variables.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              To manage data plan IDs, go to <strong>Admin → Data Plans</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Service Provider Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="text-primary" size={18} />
              <CardTitle className="text-base">Service Providers</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose which API provider handles each service. Click a provider name to switch — save when done.
            </p>

            <ProviderToggle
              label="Airtime"
              icon={Phone}
              current={airtimeProvider}
              onChange={setAirtimeProvider}
              options={["clubkonnect", "vtpass"]}
            />
            <ProviderToggle
              label="Mobile Data"
              icon={Zap}
              current={dataProvider}
              onChange={setDataProvider}
              options={["easyaccess", "clubkonnect", "vtpass"]}
            />
            <ProviderToggle
              label="Electricity"
              icon={Zap}
              current={electricityProvider}
              onChange={setElectricityProvider}
              options={["easyaccess", "clubkonnect", "vtpass"]}
            />
            <ProviderToggle
              label="Cable TV"
              icon={Zap}
              current={cableProvider}
              onChange={setCableProvider}
              options={["easyaccess", "clubkonnect", "vtpass"]}
            />
            <ProviderToggle
              label="Exam Tokens"
              icon={BookOpen}
              current={examProvider}
              onChange={setExamProvider}
              options={["easyaccess", "clubkonnect", "vtpass"]}
            />

            <p className="text-xs text-muted-foreground pt-1">
              Select any provider for each service. Changes take effect immediately on save. Make sure you have valid credentials for whichever provider you choose.
            </p>
          </CardContent>
        </Card>

        {/* Exam Types Management */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="text-primary" size={18} />
              <CardTitle className="text-base">Exam Types</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ensure WAEC, NECO, JAMB and NABTEB exam types are available. Click below to add any that are missing.
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {["WAEC", "NECO", "JAMB", "NABTEB"].map((code) => (
                <div key={code} className="p-3 rounded-lg border border-border bg-muted/40">
                  <p className="font-bold text-sm">{code}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={handleSeedExams} disabled={seedingExams} className="gap-2">
              {seedingExams ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {seedingExams ? "Syncing..." : "Sync Exam Types"}
            </Button>
            <p className="text-xs text-muted-foreground">Safe to run multiple times — only adds missing types, never duplicates.</p>
          </CardContent>
        </Card>

        {/* Monnify Debug */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bug className="text-primary" size={18} />
              <CardTitle className="text-base">Monnify Connection Test</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Test whether Monnify credentials are working. Helps diagnose issues with virtual account generation.
            </p>
            <Button variant="outline" onClick={handleTestMonnify} disabled={testingMonnify} className="gap-2">
              {testingMonnify ? <Loader2 size={14} className="animate-spin" /> : <Bug size={14} />}
              {testingMonnify ? "Testing..." : "Test Monnify Auth"}
            </Button>
          </CardContent>
        </Card>

        {/* Contact & Support */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="text-primary" size={18} />
              <CardTitle className="text-base">Contact & Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-semibold mb-2 block">Support Email</Label>
              <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@yourdomain.com" className="h-12" />
              <p className="text-xs text-muted-foreground mt-1">Shown to customers on the support page</p>
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Support Phone Number</Label>
              <Input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} placeholder="e.g. 09026329296" className="h-12" />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">WhatsApp Number</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="e.g. 09026329296" className="h-12" />
              <p className="text-xs text-muted-foreground mt-1">Used for WhatsApp support link</p>
            </div>
          </CardContent>
        </Card>

        {/* Announcement Banner */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="text-primary" size={18} />
              <CardTitle className="text-base">Announcement Banner</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Show announcement to all customers</p>
                <p className="text-xs text-muted-foreground">Displays a banner on the customer dashboard</p>
              </div>
              <Switch checked={announcementActive} onCheckedChange={setAnnouncementActive} />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Announcement Message</Label>
              <Textarea
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g. We are currently experiencing high demand. Orders may take longer than usual."
                className="resize-none min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Transfer */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="text-primary" size={18} />
              <CardTitle className="text-base">Bank Transfer (Manual Funding)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="font-semibold text-sm">Show bank transfer option to customers</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customers will see your account number and transfer directly to fund their wallet (manual approval).
                </p>
              </div>
              <Switch checked={bankTransferActive} onCheckedChange={setBankTransferActive} />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Bank Name</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Opay, Moniepoint, GTBank" className="h-12" />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Account Number</Label>
              <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="e.g. 8012345678" className="h-12 font-mono" />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Account Name</Label>
              <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="e.g. SanTech Data / Your Name" className="h-12" />
            </div>
            <p className="text-xs text-muted-foreground">
              Customers will be instructed to transfer and then contact you to get their wallet credited.
            </p>
          </CardContent>
        </Card>

        {/* Airtime to Cash */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="text-primary" size={18} />
              <CardTitle className="text-base">Airtime to Cash</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="font-semibold text-sm">Allow customers to submit requests</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When frozen, customers will see an unavailability notice and the API will block new submissions.
                </p>
              </div>
              <Switch
                checked={airtimeToCashActive}
                onCheckedChange={setAirtimeToCashActive}
                className={!airtimeToCashActive ? "data-[state=unchecked]:bg-red-400" : ""}
              />
            </div>
            {!airtimeToCashActive && (
              <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                ⚠️ Service is currently <strong>frozen</strong> — customers cannot submit new requests.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Gateways */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="text-primary" size={18} />
              <CardTitle className="text-base">Payment Gateways</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Enable or disable which gateways customers can use to fund their wallets.</p>
            {[
              { label: "Paystack", desc: "Cards, Bank Transfer, USSD", value: paystackActive, set: setPaystackActive },
              { label: "Monnify", desc: "Bank Transfer, Cards, USSD", value: monnifyActive, set: setMonnifyActive },
            ].map((gw) => (
              <div key={gw.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{gw.label}</p>
                    <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                      API key set ✓
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{gw.desc}</p>
                </div>
                <Switch checked={gw.value} onCheckedChange={gw.set} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Business Rules */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="text-primary" size={18} />
              <CardTitle className="text-base">Business Rules</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-semibold mb-2 block">Referral Bonus (₦)</Label>
              <Input type="number" value={referralBonus} onChange={(e) => setReferralBonus(e.target.value)} className="h-12" />
              <p className="text-xs text-muted-foreground mt-1">Amount credited when a referred user makes their first purchase</p>
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Minimum Wallet Funding (₦)</Label>
              <Input type="number" value={minFunding} onChange={(e) => setMinFunding(e.target.value)} className="h-12" />
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </AdminLayout>
  );
}
