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
import { Search, Users, ShieldCheck, ShieldX, Wallet } from "lucide-react";
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
                    <p className="text-xs text-muted-foreground">Joined {format(new Date(user.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFundUser(user)}
                      className="gap-1"
                    >
                      <Wallet size={14} /> Fund
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
    </AdminLayout>
  );
}
