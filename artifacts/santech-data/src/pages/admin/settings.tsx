import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Mail, CreditCard, Megaphone, Save, Loader2,
  ArrowRightLeft, BookOpen, RefreshCw, Bug, CheckCircle, AlertCircle,
} from "lucide-react";

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

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
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

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold ${ok ? "text-green-600" : "text-amber-600"}`}>
      {ok ? <CheckCircle size={13} className="text-green-500" /> : <AlertCircle size={13} className="text-amber-500" />}
      {label}
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

  const [kybConfigured, setKybConfigured] = useState(false);

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
      setKybConfigured(s.kybdata_configured === "true");
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        supportEmail, supportPhone, whatsapp, announcement,
        announcementActive: String(announcementActive),
        paystackActive: String(paystackActive),
        monnifyActive: String(monnifyActive),
        airtimeToCashActive: String(airtimeToCashActive),
        bankTransferActive: String(bankTransferActive),
        bankAccountNumber, bankAccountName, bankName,
        referralBonus, minFunding,
      });
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

        {/* Provider Status */}
        <SectionCard icon={Settings} title="Service Providers">
          <p className="text-xs text-slate-500 -mt-1">
            Providers are configured via environment variables on the server. Contact your developer to update them.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-800">KYB Data</p>
                <p className="text-xs text-slate-500">Airtime · Data · Electricity · Cable TV · Exam Pins</p>
              </div>
              <StatusBadge ok={kybConfigured} label={kybConfigured ? "Active" : "Token needed"} />
            </div>
          </div>
        </SectionCard>

        {/* Exam Types */}
        <SectionCard icon={BookOpen} title="Exam Types">
          <p className="text-xs text-slate-500 -mt-1">
            Ensure WAEC, NECO, JAMB and NABTEB are available for customers.
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {["WAEC", "NECO", "JAMB", "NABTEB"].map((code) => (
              <div key={code} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <p className="font-bold text-xs text-slate-700">{code}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleSeedExams} disabled={seedingExams} className="gap-2">
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
          <Button variant="outline" size="sm" onClick={handleTestMonnify} disabled={testingMonnify} className="gap-2">
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
          {!airtimeToCashActive && (
            <p className="text-xs text-red-600 font-medium flex items-center gap-1">
              ⚠️ Service is currently <strong>paused</strong> — customers cannot submit new requests.
            </p>
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
            <Textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g. Service is running smoothly. Enjoy fast data delivery!"
              className="resize-none min-h-[80px] text-sm"
            />
          </div>
        </SectionCard>

        {/* Contact */}
        <SectionCard icon={Mail} title="Contact & Support">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Support Email</Label>
            <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@yourdomain.com" className="h-10" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Support Phone</Label>
            <Input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} placeholder="e.g. 09026329296" className="h-10" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">WhatsApp Number</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="e.g. 09026329296" className="h-10" />
          </div>
        </SectionCard>

        {/* Wallet Settings */}
        <SectionCard icon={CreditCard} title="Wallet Settings">
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
