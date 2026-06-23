import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminFundUser } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Wallet, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

async function fetchFailedPayments() {
  const token = sessionStorage.getItem("santech_token");
  const res = await fetch(`${import.meta.env.BASE_URL}api/admin/failed-payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json() as Promise<FailedPayment[]>;
}

type FailedPayment = {
  id: string;
  reference: string;
  amount: number;
  status: "failed" | "pending";
  description: string;
  createdAt: string;
  metadata: any;
  user: { id: string; fullName: string; email: string; phone: string } | null;
  currentBalance: number;
};

const STATUS_ICON: Record<string, any> = {
  failed: XCircle,
  pending: Clock,
};

const STATUS_COLOR: Record<string, string> = {
  failed: "text-red-600 bg-red-50 dark:bg-red-900/20",
  pending: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
};

export default function FailedPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creditUser, setCreditUser] = useState<FailedPayment | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");

  const { data: payments = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "failed-payments"],
    queryFn: fetchFailedPayments,
  });

  const adminFund = useAdminFundUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Wallet credited!", description: `₦${parseFloat(creditAmount).toLocaleString()} sent to ${creditUser?.user?.fullName}` });
        setCreditUser(null);
        setCreditAmount("");
        setCreditNote("");
        queryClient.invalidateQueries({ queryKey: ["admin", "failed-payments"] });
        refetch();
      },
      onError: (error: any) => {
        toast({ title: "Failed to credit wallet", description: error.data?.error, variant: "destructive" });
      },
    },
  });

  const totalAffected = payments.length;
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <PageHeader
          title="Failed Payments"
          description="Wallet funding transactions that failed or are stuck pending"
        />
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Affected Transactions</p>
              <p className="text-2xl font-bold">{totalAffected}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
              <Wallet className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Unresolved Amount</p>
              <p className="text-2xl font-bold">₦{totalAmount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Action Required</p>
              <p className="text-2xl font-bold">{totalAffected > 0 ? "Yes" : "None"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-48" />
                    <div className="h-3 bg-muted rounded w-64" />
                  </div>
                  <div className="h-9 bg-muted rounded w-28" />
                </div>
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle2 className="h-14 w-14 mx-auto mb-4 text-green-500 opacity-60" />
              <p className="text-lg font-semibold">All clear!</p>
              <p className="text-muted-foreground text-sm mt-1">No failed or pending wallet funding transactions.</p>
            </div>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => {
                const StatusIcon = STATUS_ICON[payment.status] ?? AlertTriangle;
                return (
                  <div key={payment.id} className="p-4 flex flex-wrap items-start gap-4">
                    <div className={`p-2.5 rounded-full shrink-0 ${STATUS_COLOR[payment.status]}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="font-semibold">{payment.user?.fullName ?? "Unknown User"}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          payment.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.user?.email} · {payment.user?.phone}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ref: <span className="font-mono">{payment.reference}</span> · {format(new Date(payment.createdAt), "dd MMM yyyy, h:mm a")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Gateway: <span className="font-medium capitalize">{payment.metadata?.gateway ?? "unknown"}</span> · Current balance: <span className="font-medium">₦{payment.currentBalance.toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-lg">₦{payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Paid amount</p>
                      </div>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setCreditUser(payment);
                          setCreditAmount(payment.amount.toString());
                          setCreditNote(`Manual credit for failed payment — Ref: ${payment.reference}`);
                        }}
                      >
                        <Wallet className="h-4 w-4" />
                        Credit Wallet
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit dialog */}
      <Dialog open={!!creditUser} onOpenChange={() => setCreditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credit Wallet — {creditUser?.user?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
              <p><span className="text-muted-foreground">Original amount paid:</span> <span className="font-bold">₦{creditUser?.amount.toLocaleString()}</span></p>
              <p><span className="text-muted-foreground">Current wallet balance:</span> <span className="font-semibold">₦{creditUser?.currentBalance.toLocaleString()}</span></p>
              <p><span className="text-muted-foreground">Reference:</span> <span className="font-mono text-xs">{creditUser?.reference}</span></p>
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Amount to Credit (₦)</Label>
              <Input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="h-12"
              />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Note</Label>
              <Input
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                className="h-12"
              />
            </div>
            <Button
              className="w-full"
              disabled={adminFund.isPending || !creditAmount || parseFloat(creditAmount) <= 0}
              onClick={() =>
                adminFund.mutate({
                  id: creditUser!.user!.id,
                  data: { amount: parseFloat(creditAmount), note: creditNote },
                })
              }
            >
              {adminFund.isPending ? "Crediting..." : `Credit ₦${parseFloat(creditAmount || "0").toLocaleString()} to wallet`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
