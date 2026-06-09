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
import { Settings, Mail, CreditCard, Megaphone, Save, Loader2, Zap, ArrowRightLeft, Key, BookOpen, RefreshCw, Bug, Phone, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

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

type Provider = "easyaccess" | "clubkonnect" | "nellobyte";

const PROVIDER_LABELS: Record<Provider, string> = {
  easyaccess: "EasyAccess",
  clubkonnect: "Clubkonnect",
  nellobyte: "Nellobyte",
};

const PROVIDER_COLORS: Record<Provider, string> = {
  easyaccess: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  clubkonnect: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  nellobyte: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
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
            Active: <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${PROVIDER_COLORS[current]}`}>{PROVIDER_LABELS[current]}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-1.5">
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

function CredentialField({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Enter value"}
          className="h-10 font-mono text-sm"
        />
        <Button variant="outline" size="sm" onClick={() => setShow((v) => !v)} className="shrink-0 px-2.5 h-10">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </Button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProviderCard({
  name, icon: Icon, color, configured, badges, children,
}: {
  name: string; icon: React.ElementType; color: string; configured: boolean;
  badges: string[]; children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon size={16} className={color} />
          <p className="font-bold text-sm">{name}</p>
          <div className="flex gap-1">
            {badges.map((b) => (
              <Badge key={b} variant="outline" className="text-[10px] h-4 px-1.5">{b}</Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {configured ? (
            <>
              <CheckCircle size={13} className="text-green-500" />
              <span className="text-green-600 font-semibold">Configured</span>
            </>
          ) : (
            <>
              <AlertCircle size={13} className="text-amber-500" />
              <span className="text-amber-600 font-semibold">Not set</span>
            </>
          )}
        </div>
      </div>
      {children}
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

  // EasyAccess credentials
  const [easyAccessToken, setEasyAccessToken] = useState("");

  // Clubkonnect credentials
  const [ckPhone, setCkPhone] = useState("");
  const [ckApiKey, setCkApiKey] = useState("");
  const [ckPassword, setCkPassword] = useState("");

  // Nellobyte credentials
  const [nbApiKey, setNbApiKey] = useState("");
  const [nbUserId, setNbUserId] = useState("");

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
      // Provider credentials
      if (s.easyaccess_api_token) setEasyAccessToken(s.easyaccess_api_token);
      if (s.clubkonnect_phone) setCkPhone(s.clubkonnect_phone);
      if (s.clubkonnect_apikey) setCkApiKey(s.clubkonnect_apikey);
      if (s.clubkonnect_password) setCkPassword(s.clubkonnect_password);
      if (s.nellobyte_apikey) setNbApiKey(s.nellobyte_apikey);
      if (s.nellobyte_userid) setNbUserId(s.nellobyte_userid);
      // Service providers
      if (s.airtimeProvider) setAirtimeProvider(s.airtimeProvider as Provider);
      if (s.dataProvider) setDataProvider(s.dataProvider as Provider);
      if (s.electricityProvider) setElectricityProvider(s.electricityProvider as Provider);
      if (s.cableProvider) setCableProvider(s.cableProvider as Provider);
      if (s.examProvider) setExamProvider(s.examProvider as Provider);
      setLoading(false);
    });
  }, []);

  const eaConfigured = !!easyAccessToken;
  const ckConfigured = !!(ckPhone && ckApiKey);
  const nbConfigured = !!(nbApiKey && nbUserId);

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
      if (ckPhone) payload.clubkonnect_phone = ckPhone;
      if (ckApiKey) payload.clubkonnect_apikey = ckApiKey;
      if (ckPassword) payload.clubkonnect_password = ckPassword;
      if (nbApiKey) payload.nellobyte_apikey = nbApiKey;
      if (nbUserId) payload.nellobyte_userid = nbUserId;
      await saveSettings(payload);
      toast({ title: "Settings saved!", description: "All changes applied — provider changes take effect immediately." });
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

        {/* Provider Credentials */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Key className="text-primary" size={18} />
              <CardTitle className="text-base">Provider Credentials</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your API credentials for each provider. Changes take effect immediately after saving — no server restart needed.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">

            <ProviderCard
              name="EasyAccess"
              icon={Zap}
              color="text-blue-500"
              configured={eaConfigured}
              badges={["Data", "Electricity", "Cable", "Exam"]}
            >
              <CredentialField
                label="API Token"
                value={easyAccessToken}
                onChange={setEasyAccessToken}
                placeholder="Paste your EasyAccess Bearer token"
                hint="Stored securely in the database. Overrides the environment variable on save."
              />
            </ProviderCard>

            <ProviderCard
              name="Clubkonnect"
              icon={Phone}
              color="text-purple-500"
              configured={ckConfigured}
              badges={["Airtime", "Data", "Electricity", "Exam"]}
            >
              <div className="grid grid-cols-1 gap-3">
                <CredentialField
                  label="Registered Phone Number"
                  value={ckPhone}
                  onChange={setCkPhone}
                  placeholder="e.g. 08012345678"
                  hint="The phone number registered on your Clubkonnect account"
                />
                <CredentialField
                  label="API Key"
                  value={ckApiKey}
                  onChange={setCkApiKey}
                  placeholder="Your Clubkonnect API key"
                  hint="Found in your Clubkonnect dashboard under API settings"
                />
                <CredentialField
                  label="Account Password"
                  value={ckPassword}
                  onChange={setCkPassword}
                  placeholder="Your Clubkonnect login password"
                  hint="Required for data bundle purchases"
                />
              </div>
            </ProviderCard>

            <ProviderCard
              name="Nellobyte"
              icon={Settings}
              color="text-green-500"
              configured={nbConfigured}
              badges={["Airtime", "Data", "Electricity", "Cable", "Exam"]}
            >
              <div className="grid grid-cols-1 gap-3">
                <CredentialField
                  label="API Key"
                  value={nbApiKey}
                  onChange={setNbApiKey}
                  placeholder="Your Nellobyte API key"
                  hint="Found in your Nellobytesystems dashboard"
                />
                <CredentialField
                  label="User ID"
                  value={nbUserId}
                  onChange={setNbUserId}
                  placeholder="Your Nellobyte User ID"
                  hint="Your account User ID on Nellobytesystems"
                />
              </div>
            </ProviderCard>

            <p className="text-xs text-muted-foreground">
              To manage data plan IDs, go to <strong>Admin → Data Plans</strong>. Make sure your server IP is whitelisted on provider dashboards that require it.
            </p>
          </CardContent>
        </Card>

        {/* Service Provider Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="text-primary" size={18} />
              <CardTitle className="text-base">Service Routing</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose which provider handles each service. Click a provider name to switch — save when done.
            </p>

            <ProviderToggle
              label="Airtime"
              icon={Phone}
              current={airtimeProvider}
              onChange={setAirtimeProvider}
              options={["clubkonnect", "nellobyte"]}
            />
            <ProviderToggle
              label="Mobile Data"
              icon={Zap}
              current={dataProvider}
              onChange={setDataProvider}
              options={["easyaccess", "clubkonnect", "nellobyte"]}
            />
            <ProviderToggle
              label="Electricity"
              icon={Zap}
              current={electricityProvider}
              onChange={setElectricityProvider}
              options={["easyaccess", "clubkonnect", "nellobyte"]}
            />
            <ProviderToggle
              label="Cable TV"
              icon={Zap}
              current={cableProvider}
              onChange={setCableProvider}
              options={["easyaccess", "nellobyte"]}
            />
            <ProviderToggle
              label="Exam Tokens"
              icon={BookOpen}
              current={examProvider}
              onChange={setExamProvider}
              options={["easyaccess", "clubkonnect", "nellobyte"]}
            />

            <p className="text-xs text-muted-foreground pt-1">
              Note: EasyAccess does not support Airtime. Clubkonnect does not support Cable TV via the admin panel.
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
              { label: "Monnify", desc: "Bank Transfer, USSD", value: monnifyActive, set: setMonnifyActive },
            ].map(({ label, desc, value, set }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={value} onCheckedChange={set} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Wallet Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="text-primary" size={18} />
              <CardTitle className="text-base">Wallet Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-semibold mb-2 block">Minimum Funding Amount (₦)</Label>
              <Input type="number" value={minFunding} onChange={(e) => setMinFunding(e.target.value)} placeholder="e.g. 100" className="h-12" />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Referral Bonus (₦)</Label>
              <Input type="number" value={referralBonus} onChange={(e) => setReferralBonus(e.target.value)} placeholder="e.g. 200" className="h-12" />
              <p className="text-xs text-muted-foreground mt-1">Credited to both referrer and new user when a referred user funds their wallet for the first time.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}
