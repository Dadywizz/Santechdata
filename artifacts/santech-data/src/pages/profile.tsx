import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, useChangePassword } from "@workspace/api-client-react";
import { User, Lock, Save, Copy, CheckCircle2 } from "lucide-react";

function shortId(id: string | undefined): string {
  if (!id) return "—";
  return "STC-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState(false);

  const customerId = shortId(user?.id);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profileMutation = useUpdateProfile({
    mutation: {
      onSuccess: (data: any) => {
        updateUser(data);
        toast({ title: "Profile updated!" });
      },
      onError: (error: any) => toast({ title: "Update failed", description: error.data?.error || "Please try again", variant: "destructive" }),
    },
  });

  const passwordMutation = useChangePassword({
    mutation: {
      onSuccess: () => {
        toast({ title: "Password changed!" });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      },
      onError: (error: any) => toast({ title: "Password change failed", description: error.data?.error, variant: "destructive" }),
    },
  });

  const handleProfileSave = () => {
    profileMutation.mutate({ data: { fullName, phone } });
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    if (newPassword.length < 8) { toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return; }
    passwordMutation.mutate({ data: { currentPassword, newPassword } });
  };

  return (
    <AppLayout>
      <PageHeader title="Profile" description="Manage your account settings" />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary p-3 rounded-xl">
                <User size={22} />
              </div>
              <div>
                <CardTitle>Personal Information</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Update your name and phone number</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-0.5">Account Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>

            <div>
              <Label className="font-semibold mb-2 block">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12" />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Phone Number</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" />
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Your Customer ID</p>
                  <p className="font-bold font-mono text-lg tracking-widest mt-0.5 text-primary">{customerId}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Use this ID when contacting support</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(customerId).then(() => {
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    });
                  }}
                  className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                >
                  {copiedId ? <CheckCircle2 size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-lg p-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Referral Code</p>
                <p className="font-bold tracking-wider mt-0.5">{user?.referralCode || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Account Status</p>
                <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                  user?.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700"
                }`}>
                  {user?.status}
                </span>
              </div>
            </div>

            <Button className="w-full" onClick={handleProfileSave} disabled={profileMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {profileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/10 text-orange-600 p-3 rounded-xl">
                <Lock size={22} />
              </div>
              <div>
                <CardTitle>Change Password</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Keep your account secure</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-semibold mb-2 block">Current Password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-12" />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12" />
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Confirm New Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12" />
            </div>
            <Button variant="outline" className="w-full" onClick={handlePasswordChange} disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
