import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useAdminGetTransactions,
  getAdminGetTransactionsQueryKey,
  useAdminResolveTransaction,
  AdminResolveTransactionInputOutcome,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { History, Search, Wifi, Phone, Zap, Tv, BookOpen, CreditCard, ArrowRightLeft, Download, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

const RESOLVABLE_TYPES = new Set(["data", "airtime", "electricity", "cable", "exam"]);
const TOKEN_TYPES = new Set(["electricity", "exam"]);

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [resolveTx, setResolveTx] = useState<any | null>(null);
  const [outcome, setOutcome] = useState<"success" | "failed">("success");
  const [token, setToken] = useState("");
  const [note, setNote] = useState("");

  const queryKey = getAdminGetTransactionsQueryKey({ page, limit: 25, type: type || undefined, status: status || undefined });
  const { data, isLoading } = useAdminGetTransactions(
    { page, limit: 25, type: type || undefined, status: status || undefined },
    { query: { queryKey } }
  );

  const resolveMutation = useAdminResolveTransaction({
    mutation: {
      onSuccess: () => {
        toast({ title: "Transaction resolved", description: `Marked as ${outcome}.` });
        setResolveTx(null);
        setToken("");
        setNote("");
        queryClient.invalidateQueries({ queryKey });
      },
      onError: (error: any) => {
        toast({ title: "Could not resolve transaction", description: error.data?.error || "Something went wrong", variant: "destructive" });
      },
    },
  });

  const txs = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  const filtered = search
    ? txs.filter((tx: any) =>
        tx.description?.toLowerCase().includes(search.toLowerCase()) ||
        tx.reference?.includes(search) ||
        tx.userId?.includes(search) ||
        tx.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        tx.user?.phone?.includes(search) ||
        tx.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : txs;

  const needsResolution = (tx: any) =>
    RESOLVABLE_TYPES.has(tx.type) && (tx.status === "pending" || tx.status === "failed") && !tx.metadata?.resolution;

  const openResolve = (tx: any) => {
    setResolveTx(tx);
    setOutcome("success");
    setToken("");
    setNote("");
  };

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
                <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
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
                        {tx.metadata?.awaitingReview && (
                          <span className="block mt-1 text-[9px] text-orange-600 font-semibold uppercase">Awaiting review</span>
                        )}
                        {tx.metadata?.resolution && (
                          <span className="block mt-1 text-[9px] text-muted-foreground">Resolved: {tx.metadata.resolution.outcome}</span>
                        )}
                      </td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground text-xs">
                        {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                      </td>
                      <td className="p-4 text-right">
                        {needsResolution(tx) && (
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openResolve(tx)}>
                            <ShieldQuestion className="h-3.5 w-3.5" />
                            Resolve
                          </Button>
                        )}
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

      <Dialog open={!!resolveTx} onOpenChange={(open) => { if (!open) setResolveTx(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
              <p><span className="text-muted-foreground">Customer:</span> <span className="font-semibold">{resolveTx?.user?.fullName ?? resolveTx?.userId}</span></p>
              <p><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{resolveTx?.type}</span></p>
              <p><span className="text-muted-foreground">Amount:</span> <span className="font-bold">₦{Number(resolveTx?.amount ?? 0).toLocaleString()}</span></p>
              <p><span className="text-muted-foreground">Current status:</span> <span className="font-medium capitalize">{resolveTx?.status}</span></p>
              <p><span className="text-muted-foreground">Reference:</span> <span className="font-mono text-xs">{resolveTx?.reference}</span></p>
            </div>

            <p className="text-xs text-muted-foreground">
              {resolveTx?.status === "pending"
                ? "This purchase's wallet debit was never refunded. Choose \"Success\" if the provider actually delivered it, or \"Failed\" to refund the customer now."
                : "This purchase was already refunded when it failed. Choose \"Success\" only if you've confirmed on the provider's portal that it actually went through — this will re-debit the customer's wallet."}
            </p>

            <div>
              <Label className="font-semibold mb-2 block">What actually happened?</Label>
              <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as "success" | "failed")} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={AdminResolveTransactionInputOutcome.success} id="outcome-success" />
                  <Label htmlFor="outcome-success" className="font-normal cursor-pointer">Provider delivered it (Success)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={AdminResolveTransactionInputOutcome.failed} id="outcome-failed" />
                  <Label htmlFor="outcome-failed" className="font-normal cursor-pointer">Provider did not deliver (Failed)</Label>
                </div>
              </RadioGroup>
            </div>

            {outcome === "success" && resolveTx && TOKEN_TYPES.has(resolveTx.type) && (
              <div>
                <Label className="font-semibold mb-2 block">Token / Reference (optional)</Label>
                <Input placeholder="e.g. the token from the provider's portal" value={token} onChange={(e) => setToken(e.target.value)} className="h-11" />
              </div>
            )}

            <div>
              <Label className="font-semibold mb-2 block">Note (what you observed on the provider's portal)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Confirmed on EasyAccess portal — token issued at 14:02" rows={3} />
            </div>

            <Button
              className="w-full"
              disabled={resolveMutation.isPending || !note.trim()}
              onClick={() =>
                resolveTx &&
                resolveMutation.mutate({
                  id: resolveTx.id,
                  data: { outcome, note, ...(token.trim() ? { token: token.trim() } : {}) },
                })
              }
            >
              {resolveMutation.isPending ? "Resolving..." : `Confirm — Mark as ${outcome}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
