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
import { Settings, Mail, CreditCard, Megaphone, Save, Loader2, Zap, ArrowRightLeft, Key, BookOpen, RefreshCw, Bug, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

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

  // KYB Data credentials
  const [kybToken, setKybToken] = useState("");

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
      if (s.kybdata_api_token) setKybToken(s.kybdata_api_token);
      setLoading(false);
    });
  }, []);

  const kybConfigured = !!kybToken;

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
      };
      if (kybToken) payload.kybdata_api_token = kybToken;
      await saveSettings(payload);
      toast({ title: "Settings saved!", description: "All changes applied." });
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

        {/* KYB Data Credentials */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Key className="text-primary" size={18} />
              <CardTitle className="text-base">KYB Data — Provider Credentials</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              KYB Data powers all services (airtime, data, electricity, cable, exam). Changes take effect immediately after saving.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProviderCard
              name="KYB Data"
              icon={Key}
              color="text-orange-500"
              configured={kybConfigured}
              badges={["Airtime", "Data", "Electricity", "Cable", "Exam"]}
            >
              <CredentialField
                label="API Token"
                value={kybToken}
                onChange={setKybToken}
                placeholder="Your KYB Data Bearer token"
                hint="Generate via POST /api/v2/create-api-key on your KYB Data account. Paste the token here."
              />
            </ProviderCard>
            <p className="text-xs text-muted-foreground">
              To manage data plan IDs, go to <strong>Admin → Data Plans</strong>.
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
