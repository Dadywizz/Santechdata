import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetNotifications, getGetNotificationsQueryKey, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Wallet, Wifi, AlertCircle, Info, Gift } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, any> = {
  wallet: Wallet,
  data: Wifi,
  alert: AlertCircle,
  broadcast: Gift,
  system: Info,
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetNotifications(undefined, { query: { queryKey: getGetNotificationsQueryKey() } });

  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    },
  });

  const markAll = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    },
  });

  const notifications = (data as any) ?? [];
  const unread = notifications.filter((n: any) => !n.isRead).length;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Notifications" description={unread > 0 ? `${unread} unread notifications` : "All caught up!"} />
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 flex items-start gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-muted rounded w-48" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No notifications yet</p>
              <p className="text-sm mt-1">We'll notify you about transactions and updates</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n: any) => {
                const Icon = ICON_MAP[n.type] || Info;
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markRead.mutate({ id: n.id })}
                    className={cn(
                      "p-4 flex items-start gap-4 transition-colors cursor-pointer",
                      !n.isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      !n.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("font-medium", !n.isRead && "font-semibold")}>{n.title}</p>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.createdAt), "MMM d, yyyy h:mm a")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
