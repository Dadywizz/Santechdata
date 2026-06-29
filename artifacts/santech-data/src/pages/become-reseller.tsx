import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import {
  CheckCircle, Star, Wallet, TrendingUp, Users, ShieldCheck,
  Loader2, Crown, Zap, ArrowRight, BadgeCheck,
} from "lucide-react";

const tok = () => sessionStorage.getItem("santech_token") ?? "";

async function fetchStatus() {
  const res = await fetch("/api/reseller/status", {
    headers: { Authorization: `Bearer ${tok()}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function doUpgrade() {
  const res = await fetch("/api/reseller/upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
  });
  return res.json();
}

const BENEFITS = [
  { icon: TrendingUp, title: "Wholesale Data Prices",    desc: "Buy all data bundles at exclusive reseller rates — save more on every transaction." },
  { icon: Wallet,     title: "No Monthly Charges",       desc: "One-time ₦500 activation. No subscription, no hidden fees, ever." },
  { icon: Zap,        title: "Instant Activation",       desc: "Your reseller status is activated immediately after payment." },
  { icon: Users,      title: "Sell to Anyone",           desc: "Buy data at wholesale and sell to your own customers at any price you choose." },
  { icon: ShieldCheck,title: "Same Reliable Service",    desc: "Same fast delivery and 24/7 support you already enjoy." },
  { icon: Star,       title: "Priority Treatment",       desc: "Resellers get priority support and early access to new plans." },
];

export default function BecomeReseller() {
  const { user, refreshUser } = useAuth() as any;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchStatus().then((s) => { setStatus(s); setLoading(false); });
  }, []);

  const isReseller = user?.role === "reseller" || status?.isReseller;
  const walletBalance = status?.walletBalance ?? 0;
  const canAfford = walletBalance >= 500;

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await doUpgrade();
      if (res.success) {
        toast({ title: "🎉 You're now a reseller!", description: res.message });
        if (refreshUser) await refreshUser();
        navigate("/dashboard");
      } else {
        toast({ title: "Upgrade failed", description: res.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      </AppLayout>
    );
  }

  if (isReseller) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <Crown size={36} className="text-green-600" />
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-200 mb-4 text-sm px-3 py-1">
            <BadgeCheck size={14} className="mr-1.5" /> Active Reseller
          </Badge>
          <h1 className="text-2xl font-black text-slate-900 mb-2">You're a SanTech Reseller</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your reseller account is active. You enjoy exclusive wholesale pricing on all data bundles.
          </p>
          <Button onClick={() => navigate("/buy-data")} className="gap-2">
            Buy Data at Wholesale Price <ArrowRight size={16} />
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Become a Reseller" subtitle="Join the SanTech reseller programme" />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Crown size={22} />
          <span className="font-bold text-lg">SanTech Reseller Programme</span>
        </div>
        <p className="text-blue-100 text-sm mb-4 leading-relaxed">
          Become an authorised SanTech reseller and unlock exclusive wholesale prices on all data bundles.
          Buy cheap, sell at your own price, and earn real profit.
        </p>
        <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-200 mb-1">One-time activation fee</p>
            <p className="text-3xl font-black">₦500</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-200 mb-1">Your wallet balance</p>
            <p className={`text-xl font-bold ${canAfford ? "text-green-300" : "text-red-300"}`}>
              ₦{walletBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">What You Get</h2>
        <div className="grid grid-cols-1 gap-3">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-4">
          <h2 className="text-sm font-bold text-slate-700 mb-3">How It Works</h2>
          <div className="space-y-3">
            {[
              { step: "1", text: "Click Activate below — ₦500 is deducted from your wallet" },
              { step: "2", text: "Your account is instantly upgraded to reseller status" },
              { step: "3", text: "Buy data at exclusive wholesale prices immediately" },
              { step: "4", text: "Sell to your customers at your own price and keep the profit" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {step}
                </div>
                <p className="text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="sticky bottom-4 z-10">
        {canAfford ? (
          <Button
            onClick={handleUpgrade}
            disabled={upgrading}
            size="lg"
            className="w-full h-14 text-base font-bold shadow-xl gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {upgrading ? (
              <><Loader2 size={18} className="animate-spin" /> Activating...</>
            ) : (
              <><Crown size={18} /> Activate Reseller — Pay ₦500</>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-sm text-amber-700 font-medium">
                Your wallet needs ₦{(500 - walletBalance).toLocaleString()} more to activate.
              </p>
            </div>
            <Button
              onClick={() => navigate("/fund-wallet")}
              size="lg"
              variant="outline"
              className="w-full h-14 text-base font-bold gap-2"
            >
              <Wallet size={18} /> Fund Wallet First
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
