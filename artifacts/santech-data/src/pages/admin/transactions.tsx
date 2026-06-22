import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAdminGetTransactions, getAdminGetTransactionsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { History, Search, Wifi, Phone, Zap, Tv, BookOpen, CreditCard, ArrowRightLeft, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  data: { label: "Data", icon: Wifi, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  airtime: { label: "Airtime", icon: Phone, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
  electricity: { label: "Electricity", icon: Zap, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  cable: { label: "Cable", icon: Tv, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  exam: { label: "Exam", icon: BookOpen, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
  wallet_fund: { label: "Wallet Fund", icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
  wallet_transfer: { label: "Transfer", icon: ArrowRightLeft, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
};

const STATUS_BADGE: Record<string, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function AdminTransactions() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminGetTransactions(
    { page, limit: 25, type: type || undefined, status: status || undefined },
    { query: { queryKey: getAdminGetTransactionsQueryKey({ page, limit: 25, type: type || undefined, status: status || undefined }) } }
  );

  const txs = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  const filtered = search
    ? txs.filter((tx: any) => tx.description?.toLowerCase().includes(search.toLowerCase()) || tx.reference?.includes(search) || tx.userId?.includes(search))
    : txs;

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Transactions" description={`${total.toLocaleString()} total transactions`} />
        <Button variant="outline" size="sm" asChild>
          <a href="/api/admin/export/transactions.csv" download>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </a>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by ref or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={type} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-10 w-36">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-10 w-32">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Reference</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    No transactions found
                  </td>
                </tr>
              ) : (
                filtered.map((tx: any) => {
                  const meta = TYPE_META[tx.type] || TYPE_META.wallet_fund;
                  const Icon = meta.icon;
                  return (
                    <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", meta.bg, meta.color)}>
                          <Icon size={14} />
                        </div>
                      </td>
                      <td className="p-4 min-w-[160px]">
                        {tx.user ? (
                          <div>
                            <p className="font-medium text-sm leading-tight">{tx.user.fullName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{tx.user.phone}</p>
                            <p className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[140px]">{tx.user.id}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px] block">{tx.userId}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-medium truncate max-w-[200px]">{tx.description}</p>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="font-mono text-xs text-muted-foreground">{tx.reference}</span>
                      </td>
                      <td className="p-4 text-right font-semibold">₦{Number(tx.amount).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={cn("text-[10px] uppercase px-2 py-0.5 rounded-full font-medium", STATUS_BADGE[tx.status] || STATUS_BADGE.pending)}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground text-xs">
                        {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
