import { useState } from "react";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WalletCard } from "@/components/WalletCard";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Wifi, Zap, Tv, BookOpen, CreditCard, History, ArrowUpRight, Bell, X } from "lucide-react";
import { format } from "date-fns";

const QUICK_ACTIONS = [
  { href: "/buy-data", label: "Buy Data", icon: Wifi, color: "text-blue-500", bg: "bg-blue-500/10" },
  { href: "/buy-electricity", label: "Electricity", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { href: "/buy-cable", label: "Cable TV", icon: Tv, color: "text-purple-500", bg: "bg-purple-500/10" },
  { href: "/buy-exam", label: "Exam Pins", icon: BookOpen, color: "text-red-500", bg: "bg-red-500/10" },
  { href: "/fund-wallet", label: "Fund Wallet", icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
];

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: unreadNotifications = [] } = useGetNotifications({ isRead: false } as any);
  const markAllRead = useMarkAllNotificationsRead();
  const [dismissed, setDismissed] = useState(false);

  const latestNotification = (unreadNotifications as any[])[0];
  const showBanner = !dismissed && !!latestNotification;

  const handleDismiss = () => {
    setDismissed(true);
    markAllRead.mutate();
  };

  return (
    <AppLayout>
      {showBanner && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 text-foreground">
          <Bell className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-primary">{latestNotification.title}</p>
            <p className="text-sm mt-0.5 text-muted-foreground">{latestNotification.message}</p>
            {(unreadNotifications as any[]).length > 1 && (
              <Link href="/notifications" className="text-xs text-primary font-medium hover:underline mt-1 inline-block">
                View {(unreadNotifications as any[]).length - 1} more notification{(unreadNotifications as any[]).length > 2 ? "s" : ""} →
              </Link>
            )}
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <PageHeader title="Dashboard" description="Welcome to SanTech Data" />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2">
          <WalletCard />
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Spend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">₦{(summary?.monthlySpend || 0).toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">This month's total transactions</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold tracking-tight mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="hover:bg-accent/50 hover:border-primary/50 transition-colors cursor-pointer text-center h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center gap-3">
                <div className={`p-3 rounded-full ${action.bg} ${action.color}`}>
                  <action.icon size={24} />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold tracking-tight">Recent Transactions</h2>
        <Link href="/transactions" className="text-sm font-medium text-primary flex items-center hover:underline">
          View all <ArrowUpRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y border-border">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : summary?.recentTransactions?.length ? (
            <div className="divide-y border-border">
              {summary.recentTransactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full flex-shrink-0 ${
                      tx.type === 'wallet_fund' ? 'bg-green-500/10 text-green-600' : 'bg-primary/10 text-primary'
                    }`}>
                      {tx.type === 'wallet_fund' ? <CreditCard size={18} /> : <History size={18} />}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === 'wallet_fund' ? 'text-green-600' : ''}`}>
                      {tx.type === 'wallet_fund' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </p>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-medium ${
                      tx.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
