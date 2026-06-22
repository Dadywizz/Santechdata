import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAdminGetUsers, getAdminGetUsersQueryKey, useAdminUpdateUserStatus, useAdminFundUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, ShieldCheck, ShieldX, Wallet, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [fundUser, setFundUser] = useState<any>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [fundNote, setFundNote] = useState("");
  const [resetUser, setResetUser] = useState<any>(null);
  const [resetting, setResetting] = useState(false);

  const { data, isLoading } = useAdminGetUsers(
    { page, limit: 20, search: search || undefined, status: (status as any) || undefined },
    { query: { queryKey: getAdminGetUsersQueryKey({ page, limit: 20, search: search || undefined, status: (status as any) || undefined }) } }
  );

  const updateStatus = useAdminUpdateUserStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "User status updated" });
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      },
    },
  });

  const adminFund = useAdminFundUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Wallet funded successfully" });
        setFundUser(null); setFundAmount(""); setFundNote("");
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      },
      onError: (error: any) => toast({ title: "Failed to fund wallet", description: error.data?.error, variant: "destructive" }),
    },
  });

  const handleResetVA = async () => {
    if (!resetUser) return;
    setResetting(true);
    try {
      const token = localStorage.getItem("santech_token");
      const res = await fetch(`/api/admin/users/${resetUser.id}/reset-virtual-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to reset");
      toast({ title: "Account number cleared", description: `${resetUser.fullName} can now generate a new Flutterwave account on Fund Wallet.` });
      setResetUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch {
      toast({ title: "Reset failed", description: "Could not clear the account number.", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const users = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout>
      <PageHeader title="User Management" description={`${total.toLocaleString()} total users`} />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-10" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-10 w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
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
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-56" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-muted rounded w-20" />
                    <div className="h-8 bg-muted rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user: any) => (
                <div key={user.id} className="p-4 flex items-center gap-4 flex-wrap">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                    user.role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {user.fullName?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{user.fullName}</p>
                      {user.role === "admin" && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>
                      )}
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase",
                        user.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700"
                      )}>
                        {user.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email} · {user.phone}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono select-all" title="User ID">{user.id}</p>
                    <p className="text-xs text-muted-foreground">Joined {format(new Date(user.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFundUser(user)}
                      className="gap-1"
                    >
                      <Wallet size={14} /> Fund
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResetUser(user)}
                      className="gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                      title="Clear stored bank account so user can generate a new Flutterwave account"
                    >
                      <RefreshCw size={14} /> Reset Account
                    </Button>
                    {user.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: user.id, data: { status: "suspended" } })}
                      >
                        <ShieldX size={14} /> Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: user.id, data: { status: "active" } })}
                      >
                        <ShieldCheck size={14} /> Activate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
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

      {/* Fund wallet dialog */}
      <Dialog open={!!fundUser} onOpenChange={() => setFundUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fund Wallet — {fundUser?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="font-semibold mb-2 block">Amount (₦)</Label>
              <Input type="number" placeholder="Enter amount" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} className="h-12" />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Note</Label>
              <Input placeholder="Reason for funding" value={fundNote} onChange={(e) => setFundNote(e.target.value)} className="h-12" />
            </div>
            <Button className="w-full" onClick={() => adminFund.mutate({ id: fundUser.id, data: { amount: parseFloat(fundAmount), note: fundNote } })} disabled={adminFund.isPending || !fundAmount}>
              {adminFund.isPending ? "Processing..." : `Fund ₦${parseFloat(fundAmount || "0").toLocaleString()}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset virtual account confirmation dialog */}
      <Dialog open={!!resetUser} onOpenChange={() => setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Bank Account — {resetUser?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                This will clear <strong>{resetUser?.fullName}</strong>'s stored bank account number. They will need to go to <strong>Fund Wallet → Bank Transfer</strong> and enter their BVN or NIN to get a new Flutterwave account.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Their wallet balance is not affected.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setResetUser(null)}>Cancel</Button>
              <Button
                className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600"
                onClick={handleResetVA}
                disabled={resetting}
              >
                {resetting ? <><RefreshCw size={14} className="animate-spin" /> Resetting...</> : <><RefreshCw size={14} /> Reset Account</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
