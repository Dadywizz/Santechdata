import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import {
  CheckCircle, Star, Wallet, TrendingUp, Users, ShieldCheck,
  Loader2, Crown, Zap, ArrowRight, BadgeCheck, Copy, Share2,
  Coins, CalendarDays, UserCheck, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

const tok = () => sessionStorage.getItem("santech_token") ?? "";

async function fetchStatus() {
  const res = await fetch("/api/reseller/status", {
    headers: { Authorization: `Bearer ${tok()}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchReferrals() {
  const res = await fetch("/api/reseller/referrals", {
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
  { icon: TrendingUp, title: "Wholesale Data Prices",   desc: "Buy all data bundles at exclusive reseller rates — lower cost on every purchase." },
  { icon: Coins,      title: "Earn Commission",          desc: "Earn commission on every purchase made by people you refer using your link." },
  { icon: Wallet,     title: "No Monthly Charges",       desc: "One-time ₦500 activation. No subscription, no hidden fees, ever." },
  { icon: Zap,        title: "Instant Activation",       desc: "Your reseller status goes live the moment payment is confirmed." },
  { icon: Users,      title: "Grow Your Customer Base",  desc: "Build your own VTU business — buy cheap, sell at any price you choose." },
  { icon: ShieldCheck,title: "Priority Support",         desc: "Resellers get dedicated priority support whenever they need it." },
];

function UpgradePage({
  walletBalance,
  upgradeFee,
  commissionRate,
  upgrading,
  onUpgrade,
}: {
  walletBalance: number;
  upgradeFee: number;
  commissionRate: number;
  upgrading: boolean;
  onUpgrade: () => void;
}) {
  const [, navigate] = useLocation();
  const canAfford = walletBalance >= upgradeFee;

  return (
    <>
      <PageHeader title="Become a Reseller" subtitle="Join the SanTech reseller programme" />

      {/* Hero card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Crown size={20} className="text-amber-300" />
          <span className="font-bold text-base">SanTech Reseller Programme</span>
        </div>
        <p className="text-blue-100 text-sm mb-5 leading-relaxed">
          Unlock wholesale data prices and earn <span className="font-bold text-white">{commissionRate}% commission</span> automatically
          on every purchase made by your referrals.
        </p>
        <div className="bg-white/15 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-200 mb-0.5">One-time fee</p>
            <p className="text-3xl font-black">₦{upgradeFee.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-200 mb-0.5">Your wallet</p>
            <p className={`text-xl font-bold ${canAfford ? "text-green-300" : "text-red-300"}`}>
              ₦{walletBalance.toLocaleString()}
            </p>
            {!canAfford && (
              <p className="text-[10px] text-red-300 mt-0.5">
                Need ₦{(upgradeFee - walletBalance).toLocaleString()} more
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="mb-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">What You Get</p>
        <div className="space-y-2.5">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Icon size={17} className="text-blue-600" />
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
      <Card className="border-0 shadow-sm mb-28 md:mb-6">
        <CardContent className="pt-4 pb-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">How It Works</p>
          <div className="space-y-3">
            {[
              "Pay ₦500 activation fee — deducted instantly from your wallet",
              "Get your unique referral link to share with friends",
              "They register via your link and buy any VTU service",
              `You earn ${commissionRate}% commission on every purchase they make — automatically credited to your wallet`,
              "Also enjoy wholesale data prices for your own purchases",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fixed CTA — always visible above mobile bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 z-20 px-4 pb-3 pt-2 bg-gradient-to-t from-[#f8fafc] to-transparent md:static md:bottom-auto md:bg-none md:p-0 md:mb-6">
        {canAfford ? (
          <Button
            onClick={onUpgrade}
            disabled={upgrading}
            size="lg"
            className="w-full h-14 text-base font-bold shadow-xl gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {upgrading ? (
              <><Loader2 size={18} className="animate-spin" /> Activating your account...</>
            ) : (
              <><Crown size={18} /> Activate Reseller — Pay ₦{upgradeFee.toLocaleString()}</>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center shadow-sm">
              <p className="text-sm text-amber-700 font-semibold">
                Fund your wallet with ₦{(upgradeFee - walletBalance).toLocaleString()} more to activate
              </p>
            </div>
            <Button
              onClick={() => navigate("/fund-wallet")}
              size="lg"
              className="w-full h-14 text-base font-bold gap-2"
            >
              <Wallet size={18} /> Fund Wallet to Continue
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function ResellerDashboard({
  status,
  onRefresh,
  refreshing,
}: {
  status: any;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<any>(null);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const origin = window.location.origin;
  const referralLink = `${origin}/register?ref=${status?.referralCode ?? ""}`;

  useEffect(() => {
    fetchReferrals().then((r) => { setReferrals(r); setLoadingReferrals(false); });
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Link copied!", description: "Share it to start earning commission" });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join SanTech Data",
          text: `Buy cheap data, airtime, and more on SanTech Data. Use my referral link:`,
          url: referralLink,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  return (
    <>
      <PageHeader
        title="Reseller Dashboard"
        subtitle="Active reseller account"
        action={
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing} className="gap-1.5 h-9">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-5">
        <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 text-xs font-bold gap-1.5">
          <BadgeCheck size={13} /> Active Reseller
        </Badge>
        {status?.resellerSince && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <CalendarDays size={11} />
            Since {format(new Date(status.resellerSince), "d MMM yyyy")}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Coins size={17} className="text-amber-600" />
              </div>
              <div>
                {loadingReferrals ? (
                  <div className="h-6 w-20 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <p className="text-lg font-black text-slate-900">
                    ₦{(referrals?.totalCommission ?? 0).toLocaleString()}
                  </p>
                )}
                <p className="text-[10px] text-slate-500">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users size={17} className="text-blue-600" />
              </div>
              <div>
                {loadingReferrals ? (
                  <div className="h-6 w-10 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <p className="text-lg font-black text-slate-900">
                    {referrals?.totalReferrals ?? 0}
                  </p>
                )}
                <p className="text-[10px] text-slate-500">Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <TrendingUp size={17} className="text-green-600" />
              </div>
              <div>
                {loadingReferrals ? (
                  <div className="h-6 w-16 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <p className="text-lg font-black text-slate-900">
                    ₦{(referrals?.monthlyCommission ?? 0).toLocaleString()}
                  </p>
                )}
                <p className="text-[10px] text-slate-500">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Star size={17} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{status?.commissionRate ?? 3}%</p>
                <p className="text-[10px] text-slate-500">Commission Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Your Referral Link</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mb-3 font-mono text-xs text-slate-600 break-all">
            {referralLink}
          </div>
          <div className="flex gap-2">
            <Button onClick={copyLink} variant="outline" className="flex-1 gap-2 h-10 text-sm">
              <Copy size={14} /> Copy Link
            </Button>
            <Button onClick={shareLink} className="flex-1 gap-2 h-10 text-sm">
              <Share2 size={14} /> Share
            </Button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            Anyone who registers via this link becomes your referral — earn {status?.commissionRate ?? 3}% on all their purchases
          </p>
        </CardContent>
      </Card>

      {/* Buy Data shortcut */}
      <Link href="/buy-data">
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl px-4 py-3.5 mb-4 cursor-pointer hover:from-blue-700 hover:to-indigo-700 transition-colors">
          <TrendingUp size={18} className="text-blue-200 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Buy Data at Wholesale Price</p>
            <p className="text-[11px] text-blue-200 mt-0.5">Your exclusive reseller rates are active</p>
          </div>
          <ArrowRight size={16} className="text-blue-200 shrink-0" />
        </div>
      </Link>

      {/* Recent Commissions */}
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="pt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Commissions</p>
          {loadingReferrals ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-100 rounded w-40" />
                    <div className="h-2.5 bg-slate-100 rounded w-24" />
                  </div>
                  <div className="h-4 bg-slate-100 rounded w-12" />
                </div>
              ))}
            </div>
          ) : !referrals?.recentCommissions?.length ? (
            <div className="text-center py-8">
              <Coins size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500 font-medium">No commissions yet</p>
              <p className="text-xs text-slate-400 mt-1">Share your referral link to start earning</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.recentCommissions.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <Coins size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{c.description}</p>
                    <p className="text-[10px] text-slate-400">{format(new Date(c.createdAt), "d MMM, h:mm a")}</p>
                  </div>
                  <p className="text-sm font-bold text-green-600 shrink-0">+₦{c.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referred Users */}
      <Card className="border-0 shadow-sm mb-8">
        <CardContent className="pt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Referred Customers ({referrals?.totalReferrals ?? 0})
          </p>
          {loadingReferrals ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-slate-100 rounded w-32" />
                    <div className="h-2.5 bg-slate-100 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : !referrals?.referredUsers?.length ? (
            <div className="text-center py-6">
              <UserCheck size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">Nobody has registered via your link yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {referrals.referredUsers.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                    {u.fullName?.slice(0, 2).toUpperCase() ?? "??"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{u.fullName}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <CalendarDays size={10} /> Joined {format(new Date(u.joinedAt), "d MMM yyyy")}
                    </p>
                  </div>
                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function BecomeReseller() {
  const { user } = useAuth() as any;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const s = await fetchStatus();
    setStatus(s);
    if (!silent) setLoading(false);
    else setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isReseller = user?.role === "reseller" || status?.isReseller;

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await doUpgrade();
      if (res.success) {
        toast({ title: "🎉 You're now a reseller!", description: res.message });
        await load();
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

  return (
    <AppLayout>
      {isReseller ? (
        <ResellerDashboard
          status={status}
          onRefresh={() => load(true)}
          refreshing={refreshing}
        />
      ) : (
        <UpgradePage
          walletBalance={status?.walletBalance ?? 0}
          upgradeFee={status?.upgradeFee ?? 500}
          commissionRate={status?.commissionRate ?? 3}
          upgrading={upgrading}
          onUpgrade={handleUpgrade}
        />
      )}
    </AppLayout>
  );
}
