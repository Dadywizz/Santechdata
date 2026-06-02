import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetTransactions, getGetTransactionsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { History, Wifi, Phone, Zap, Tv, BookOpen, CreditCard, ArrowRightLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPE_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  data: { icon: Wifi, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  airtime: { icon: Phone, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
  electricity: { icon: Zap, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  cable: { icon: Tv, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  exam: { icon: BookOpen, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
  wallet_fund: { icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
  wallet_transfer: { icon: ArrowRightLeft, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
};

const STATUS_BADGE: Record<string, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetTransactions(
    { page, limit: 20, type: type || undefined, status: status || undefined },
    { query: { queryKey: getGetTransactionsQueryKey({ page, limit: 20, type: type || undefined, status: status || undefined }) } }
  );

  const transactions = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const filtered = search
    ? transactions.filter((tx: any) => tx.description?.toLowerCase().includes(search.toLowerCase()) || tx.reference?.includes(search))
    : transactions;

  return (
    <AppLayout>
      <PageHeader title="Transactions" description="Your complete transaction history" />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={type} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-10 w-36">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="data">Data</SelectItem>
            <SelectItem value="airtime">Airtime</SelectItem>
            <SelectItem value="electricity">Electricity</SelectItem>
            <SelectItem value="cable">Cable</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
            <SelectItem value="wallet_fund">Wallet Fund</SelectItem>
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
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-48" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                  <div className="h-4 bg-muted rounded w-20" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No transactions found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((tx: any) => {
                const typeInfo = TYPE_ICONS[tx.type] || TYPE_ICONS.wallet_fund;
                const Icon = typeInfo.icon;
                const isCredit = tx.type === "wallet_fund";
                return (
                  <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeInfo.bg} ${typeInfo.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")} · {tx.reference}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold ${isCredit ? "text-green-600" : ""}`}>
                        {isCredit ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
                      </p>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[tx.status] || STATUS_BADGE.pending}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
    </AppLayout>
  );
}
