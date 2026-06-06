import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetAdminStats, getGetAdminStatsQueryKey } from "@workspace/api-client-react";
import { Users, TrendingUp, CreditCard, MessageSquare, Activity, Wallet, ShieldX, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

function StatCard({ title, value, sub, icon: Icon, iconClass }: { title: string; value: string | number; sub?: string; icon: any; iconClass: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${iconClass}`}>
            <Icon size={22} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });

  const s = stats as any;

  return (
    <AdminLayout>
      <PageHeader title="Admin Dashboard" description="SanTech Data overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard title="Total Users" value={s?.totalUsers?.toLocaleString() ?? 0} sub={`${s?.activeUsers ?? 0} active`} icon={Users} iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30" />
            <StatCard title="Total Revenue" value={`₦${s?.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? 0}`} icon={TrendingUp} iconClass="bg-green-100 text-green-600 dark:bg-green-900/30" />
            <StatCard title="Total Transactions" value={s?.totalTransactions?.toLocaleString() ?? 0} icon={Activity} iconClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30" />
            <StatCard title="Wallet Balance" value={`₦${s?.totalWalletBalance?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? 0}`} sub="Across all users" icon={Wallet} iconClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30" />
            <StatCard title="Pending Tickets" value={s?.pendingTickets ?? 0} icon={MessageSquare} iconClass="bg-red-100 text-red-600 dark:bg-red-900/30" />
            <StatCard title="Today's Revenue" value={`₦${s?.todayRevenue?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? 0}`} icon={CreditCard} iconClass="bg-teal-100 text-teal-600 dark:bg-teal-900/30" />
            <StatCard title="Today's Transactions" value={s?.todayTransactions ?? 0} icon={Activity} iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30" />
            <StatCard title="Active Users" value={s?.activeUsers ?? 0} sub={`of ${s?.totalUsers ?? 0} total`} icon={Users} iconClass="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30" />
          </>
        )}
      </div>

      {/* Suspended users alert — quick action to manage */}
      {!isLoading && (s?.suspendedUsers ?? 0) > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 mb-6">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600">
                <ShieldX size={20} />
              </div>
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">
                  {s.suspendedUsers} Suspended User{s.suspendedUsers > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">Click to view and reactivate suspended accounts</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0 border-red-300 text-red-700 hover:bg-red-100 gap-1">
              <Link href="/admin/users?status=suspended">
                <ShieldCheck size={14} /> Manage
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && (s?.suspendedUsers ?? 0) === 0 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/30 mb-6">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
              <ShieldCheck size={20} />
            </div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">All user accounts are active — no suspensions.</p>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
