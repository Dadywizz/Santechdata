import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WalletCard } from "@/components/WalletCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, Wifi, Zap, Tv, BookOpen, CreditCard, History, ArrowUpRight, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const SERVICES = [
  { href: "/buy-data",        label: "Buy Data",    icon: Wifi,      bg: "bg-blue-500"  },
  { href: "/buy-airtime",     label: "Buy Airtime", icon: Phone,     bg: "bg-green-500" },
  { href: "/buy-electricity", label: "Electricity", icon: Zap,       bg: "bg-amber-500" },
  { href: "/buy-cable",       label: "Cable TV",    icon: Tv,        bg: "bg-purple-500"},
  { href: "/buy-exam",        label: "Exam Pins",   icon: BookOpen,  bg: "bg-red-500"   },
  { href: "/fund-wallet",     label: "Fund Wallet", icon: CreditCard,bg: "bg-sky-500"   },
  { href: "/transactions",    label: "History",     icon: History,   bg: "bg-slate-500" },
];

const TX_ICONS: Record<string, React.ElementType> = {
  data: Wifi, airtime: Phone, electricity: Zap, cable: Tv, exam: BookOpen, wallet_fund: CreditCard,
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const firstName = (user?.fullName || user?.email || "").split(/\s|@/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppLayout>
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-xl font-black text-slate-900">{greeting}, {firstName} 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5">What would you like to do today?</p>
      </div>

      {/* Wallet Card */}
      <div className="mb-6">
        <WalletCard />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Monthly Spend</p>
          {isLoading ? <Skeleton className="h-6 w-20" /> : (
            <p className="text-xl font-black text-slate-900">₦{(summary?.monthlySpend || 0).toLocaleString()}</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Orders</p>
          {isLoading ? <Skeleton className="h-6 w-12" /> : (
            <p className="text-xl font-black text-slate-900">{(summary as any)?.totalTransactions ?? summary?.recentTransactions?.length ?? 0}</p>
          )}
        </div>
      </div>

      {/* Services grid */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Services</h2>
        <div className="grid grid-cols-4 gap-3">
          {SERVICES.map((s) => (
            <Link key={s.href} href={s.href}>
              <div className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer active:scale-95">
                <div className={`w-11 h-11 rounded-2xl ${s.bg} flex items-center justify-center shadow-sm`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{s.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Transactions</h2>
          <Link href="/transactions">
            <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold hover:underline cursor-pointer">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : summary?.recentTransactions?.length ? (
            <div className="divide-y divide-slate-100">
              {summary.recentTransactions.map((tx) => {
                const TxIcon = TX_ICONS[tx.type] ?? History;
                const isCredit = tx.type === "wallet_fund";
                const isSuccess = tx.status === "success";
                const isPending = tx.status === "pending";
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCredit ? "bg-green-100" : "bg-blue-100"}`}>
                      <TxIcon className={`h-5 w-5 ${isCredit ? "text-green-600" : "text-blue-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{tx.description}</p>
                      <p className="text-xs text-slate-400">{format(new Date(tx.createdAt), "MMM d, h:mm a")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${isCredit ? "text-green-600" : "text-slate-800"}`}>
                        {isCredit ? "+" : "-"}₦{tx.amount.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {isSuccess ? <CheckCircle className="h-3 w-3 text-green-500" /> : isPending ? <Clock className="h-3 w-3 text-amber-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                        <span className={`text-[10px] font-semibold ${isSuccess ? "text-green-600" : isPending ? "text-amber-600" : "text-red-600"}`}>{tx.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400">
              <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="text-xs mt-1">Fund your wallet to get started</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
