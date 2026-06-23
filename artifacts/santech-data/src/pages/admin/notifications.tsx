import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBroadcastNotification } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Bell, Send, Users, Landmark, Loader2 } from "lucide-react";

export default function AdminNotifications() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [mode, setMode] = useState<"all" | "single">("all");
  const [notifyingUnlinked, setNotifyingUnlinked] = useState(false);

  const mutation = useBroadcastNotification({
    mutation: {
      onSuccess: () => {
        toast({ title: "Notification sent!", description: mode === "all" ? "Sent to all active users" : "Sent to specified user" });
        setTitle(""); setMessage(""); setTargetUserId("");
      },
      onError: (error: any) => toast({ title: "Failed to send", description: error.data?.error, variant: "destructive" }),
    },
  });

  const handleSend = () => {
    if (!title || !message) { toast({ title: "Fill in title and message", variant: "destructive" }); return; }
    if (mode === "single" && !targetUserId) { toast({ title: "Enter a target user ID", variant: "destructive" }); return; }
    mutation.mutate({ data: { title, message, targetUserId: mode === "single" ? targetUserId : undefined } });
  };

  const handleNotifyUnlinked = async () => {
    setNotifyingUnlinked(true);
    try {
      const token = sessionStorage.getItem("santech_token");
      const res = await fetch("/api/admin/notifications/notify-unlinked", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.sent === 0) {
        toast({ title: "All customers already linked!", description: "Every customer already has a bank account set up." });
      } else {
        toast({ title: `Notified ${data.sent} customer${data.sent === 1 ? "" : "s"}`, description: "They'll see a notification to set up their bank account." });
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setNotifyingUnlinked(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Broadcast Notifications" description="Send notifications to users" />

      <div className="max-w-2xl space-y-6">

        {/* ── Quick action: notify unlinked customers ── */}
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-800/40 flex items-center justify-center shrink-0">
                <Landmark size={18} className="text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1">Notify Customers Without a Bank Account</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Finds all existing customers who haven't linked their BVN/NIN yet and sends them a notification telling them to set up their free dedicated bank account.
                </p>
                <Button
                  onClick={handleNotifyUnlinked}
                  disabled={notifyingUnlinked}
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                  size="sm"
                >
                  {notifyingUnlinked
                    ? <><Loader2 size={14} className="animate-spin" /> Sending...</>
                    : <><Landmark size={14} /> Notify Unlinked Customers</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Regular broadcast ── */}
        <div className="flex gap-3">
          {(["all", "single"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                mode === m ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              {m === "all" ? <Users size={16} /> : <Bell size={16} />}
              {m === "all" ? "All Users" : "Single User"}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {mode === "single" && (
              <div>
                <Label className="font-semibold mb-2 block">Target User ID</Label>
                <Input placeholder="Enter user ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="h-12" />
                <p className="text-xs text-muted-foreground mt-1">Copy the user ID from the Users management page</p>
              </div>
            )}

            <div>
              <Label className="font-semibold mb-2 block">Notification Title</Label>
              <Input placeholder="e.g. Service Maintenance" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12" />
            </div>

            <div>
              <Label className="font-semibold mb-2 block">Message</Label>
              <Textarea
                placeholder="Write your notification message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              {mode === "all" ? (
                <>
                  <Users className="text-primary shrink-0" size={18} />
                  <p className="text-sm">This notification will be sent to <strong>all active users</strong></p>
                </>
              ) : (
                <>
                  <Bell className="text-primary shrink-0" size={18} />
                  <p className="text-sm">This notification will be sent to the <strong>specified user only</strong></p>
                </>
              )}
            </div>

            <Button className="w-full" size="lg" onClick={handleSend} disabled={mutation.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {mutation.isPending ? "Sending..." : mode === "all" ? "Broadcast to All Users" : "Send to User"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Keep titles short and descriptive (under 60 chars)</li>
              <li>• Be clear and concise in the message body</li>
              <li>• Use "All Users" for platform-wide announcements</li>
              <li>• Use "Single User" for individual support follow-ups</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
