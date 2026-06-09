import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetAdminStats, getGetAdminStatsQueryKey } from "@workspace/api-client-react";
import {
  Users, TrendingUp, CreditCard, MessageSquare, Activity, Wallet,
  ShieldX, ShieldCheck, ArrowUpRight, AlertTriangle,
  History, Wifi, Bell, Settings,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

function StatCard({
  title, value, sub, icon: Icon, accent, trend,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${accent}`} />
      <div className="flex items-start justify-between gap-2 pl-1">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-black text-slate-900 mt-1 leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
          {trend && <p className="text-xs text-emerald-600 font-semibold mt-1">{trend}</p>}
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon: Icon, color }: { href: string; label: string; icon: React.ElementType; color: string }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 ml-auto group-hover:text-slate-600" />
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const s = stats as any;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{greeting}, Admin 👋</h1>
            <p className="text-sm text-slate-500 mt-0.5">{dateStr} · SanTech Data Control Panel</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Platform Online
          </div>
        </div>
      </div>

      {/* Alert: suspended users */}
      {!isLoading && (s?.suspendedUsers ?? 0) > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 text-red-600"><ShieldX className="h-5 w-5" /></div>
            <div>
              <p className="font-bold text-red-800 text-sm">{s.suspendedUsers} Suspended Account{s.suspendedUsers > 1 ? "s" : ""}</p>
              <p className="text-xs text-red-500">These users cannot access services until reactivated</p>
            </div>
          </div>
          <Link href="/admin/users?status=suspended">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer">
              <ShieldCheck className="h-3.5 w-3.5" /> Manage
            </div>
          </Link>
        </div>
      )}

      {/* Alert: open tickets */}
      {!isLoading && (s?.pendingTickets ?? 0) > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-600"><AlertTriangle className="h-5 w-5" /></div>
            <div>
              <p className="font-bold text-amber-800 text-sm">{s.pendingTickets} Open Ticket{s.pendingTickets > 1 ? "s" : ""} Awaiting Reply</p>
              <p className="text-xs text-amber-600">Respond promptly to maintain customer satisfaction</p>
            </div>
          </div>
          <Link href="/admin/tickets">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer">
              <MessageSquare className="h-3.5 w-3.5" /> View Tickets
            </div>
          </Link>
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={`₦${(s?.totalRevenue ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}
              sub="All time earnings"
              icon={TrendingUp}
              accent="bg-emerald-500"
              trend={s?.todayRevenue > 0 ? `+₦${s.todayRevenue.toLocaleString("en-NG", { maximumFractionDigits: 0 })} today` : undefined}
            />
            <StatCard
              title="Total Users"
              value={(s?.totalUsers ?? 0).toLocaleString()}
              sub={`${s?.activeUsers ?? 0} active accounts`}
              icon={Users}
              accent="bg-blue-500"
            />
            <StatCard
              title="All Transactions"
              value={(s?.totalTransactions ?? 0).toLocaleString()}
              sub={`${s?.todayTransactions ?? 0} today`}
              icon={Activity}
              accent="bg-purple-500"
            />
            <StatCard
              title="Wallet Balances"
              value={`₦${(s?.totalWalletBalance ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}
              sub="Across all users"
              icon={Wallet}
              accent="bg-orange-500"
            />
          </>
        )}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Today's Revenue"
              value={`₦${(s?.todayRevenue ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}
              icon={CreditCard}
              accent="bg-teal-500"
            />
            <StatCard
              title="Today's Orders"
              value={s?.todayTransactions ?? 0}
              icon={Activity}
              accent="bg-indigo-500"
            />
            <StatCard
              title="Open Tickets"
              value={s?.pendingTickets ?? 0}
              sub="Pending response"
              icon={MessageSquare}
              accent="bg-red-500"
            />
            <StatCard
              title="Suspended"
              value={s?.suspendedUsers ?? 0}
              sub={s?.suspendedUsers > 0 ? "Needs attention" : "All accounts active"}
              icon={ShieldX}
              accent={s?.suspendedUsers > 0 ? "bg-red-500" : "bg-emerald-500"}
            />
          </>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickLink href="/admin/users"           label="Manage Users"       icon={Users}          color="bg-blue-100 text-blue-600"     />
          <QuickLink href="/admin/transactions"    label="View Transactions"  icon={History}        color="bg-purple-100 text-purple-600"  />
          <QuickLink href="/admin/data-plans"      label="Set Data Plans"     icon={Wifi}           color="bg-teal-100 text-teal-600"     />
          <QuickLink href="/admin/tickets"         label="Support Tickets"    icon={MessageSquare}  color="bg-red-100 text-red-600"       />
          <QuickLink href="/admin/notifications"   label="Send Notification"  icon={Bell}           color="bg-amber-100 text-amber-600"   />
          <QuickLink href="/admin/settings"        label="App Settings"       icon={Settings}       color="bg-slate-100 text-slate-600"   />
        </div>
      </div>
    </AdminLayout>
  );
}
