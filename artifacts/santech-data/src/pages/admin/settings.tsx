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
import { Settings, Mail, CreditCard, Megaphone, Save, Loader2, Zap } from "lucide-react";

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

export default function AdminSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [supportEmail, setSupportEmail] = useState("santechdata@gmail.com");
  const [supportPhone, setSupportPhone] = useState("09026329296");
  const [whatsapp, setWhatsapp] = useState("09026329296");
  const [announcement, setAnnouncement] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [paystackActive, setPaystackActive] = useState(false);
  const [flutterwaveActive, setFlutterwaveActive] = useState(true);
  const [monnifyActive, setMonnifyActive] = useState(false);
  const [referralBonus, setReferralBonus] = useState("200");
  const [minFunding, setMinFunding] = useState("100");

  useEffect(() => {
    fetchSettings().then((s) => {
      if (s.supportEmail) setSupportEmail(s.supportEmail);
      if (s.supportPhone) setSupportPhone(s.supportPhone);
      if (s.whatsapp) setWhatsapp(s.whatsapp);
      if (s.announcement) setAnnouncement(s.announcement);
      if (s.announcementActive !== undefined) setAnnouncementActive(s.announcementActive === "true");
      if (s.paystackActive !== undefined) setPaystackActive(s.paystackActive === "true");
      if (s.flutterwaveActive !== undefined) setFlutterwaveActive(s.flutterwaveActive === "true");
      if (s.monnifyActive !== undefined) setMonnifyActive(s.monnifyActive === "true");
      if (s.referralBonus) setReferralBonus(s.referralBonus);
      if (s.minFunding) setMinFunding(s.minFunding);
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
        flutterwaveActive: String(flutterwaveActive),
        monnifyActive: String(monnifyActive),
        referralBonus, minFunding,
      });
      toast({ title: "Settings saved!", description: "All changes have been applied" });
    } catch {
      toast({ title: "Failed to save", description: "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
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

        {/* VTU Provider Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="text-primary" size={18} />
              <CardTitle className="text-base">VTU Provider</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
              <div>
                <p className="font-semibold text-sm text-green-800 dark:text-green-300">VTpass — Live Mode</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                  Handles data, airtime, electricity, cable TV and exam tokens. No IP whitelisting required.
                </p>
              </div>
              <span className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-full font-semibold shrink-0">Active ✓</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              To manage data plan variation codes, go to <strong>Admin → Data Plans</strong> and edit each plan.
            </p>
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
              { label: "Flutterwave", desc: "Cards, Mobile Money, Bank Transfer", value: flutterwaveActive, set: setFlutterwaveActive },
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
