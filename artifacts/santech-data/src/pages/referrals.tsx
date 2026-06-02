import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetReferrals, getGetReferralsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, Gift, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function Referrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useGetReferrals({ query: { queryKey: getGetReferralsQueryKey() } });

  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Link copied!", description: "Share this link to earn referral bonuses" });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(user?.referralCode || "");
    toast({ title: "Code copied!" });
  };

  const referrals = (data as any)?.referrals ?? [];
  const totalEarned = (data as any)?.totalEarned ?? 0;

  return (
    <AppLayout>
      <PageHeader title="Referrals" description="Earn rewards by inviting friends" />

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 text-primary p-3 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-2xl font-bold">{referrals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-green-500/10 text-green-600 p-3 rounded-xl">
              <Gift size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-bold">₦{totalEarned.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-500/10 text-blue-600 p-3 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Referral Bonus</p>
              <p className="text-2xl font-bold">₦100</p>
              <p className="text-xs text-muted-foreground">per referral</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Referral Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg font-mono text-lg font-bold tracking-widest">
              {user?.referralCode || "—"}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={copyCode}>
                <Copy size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-xs text-muted-foreground break-all">
              <span className="flex-1 truncate">{referralLink}</span>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={copyLink}>
                <Copy size={16} />
              </Button>
            </div>
            <Button className="w-full" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" /> Copy Referral Link
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : referrals.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No referrals yet</p>
              <p className="text-sm mt-1">Share your referral link to start earning</p>
            </div>
          ) : (
            <div className="divide-y">
              {referrals.map((ref: any) => (
                <div key={ref.id} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {ref.fullName?.[0] || "U"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{ref.fullName}</p>
                    <p className="text-xs text-muted-foreground">Joined {format(new Date(ref.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">+₦100</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
