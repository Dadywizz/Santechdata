import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminGetTickets, getAdminGetTicketsQueryKey, useAdminReplyTicket, useAdminUpdateTicketStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};

function TicketDetail({ ticket, onBack }: { ticket: any; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState(ticket.status);

  const replyMutation = useAdminReplyTicket({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminGetTicketsQueryKey() });
        setReply("");
        toast({ title: "Reply sent" });
      },
    },
  });

  const updateStatus = useAdminUpdateTicketStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminGetTicketsQueryKey() });
        toast({ title: "Status updated" });
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={16} /></Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{ticket.subject}</CardTitle>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", STATUS_BADGE[ticket.status] || STATUS_BADGE.open)}>
                {ticket.status?.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{ticket.category} · {ticket.userEmail} · {format(new Date(ticket.createdAt), "MMM d, yyyy")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={newStatus} onValueChange={(v) => { setNewStatus(v); updateStatus.mutate({ id: ticket.id, data: { status: v as any } }); }}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-96 overflow-y-auto bg-muted/30 rounded-xl p-4">
          {ticket.messages?.map((msg: any) => (
            <div key={msg.id} className={cn("flex gap-3", msg.senderRole === "admin" ? "flex-row-reverse" : "")}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                msg.senderRole === "admin" ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground"
              )}>
                {msg.senderRole === "admin" ? "A" : "U"}
              </div>
              <div className={cn(
                "max-w-[75%] px-4 py-3 rounded-2xl text-sm",
                msg.senderRole === "admin" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-background border border-border rounded-tl-sm"
              )}>
                <p>{msg.message}</p>
                <p className={cn("text-[10px] mt-1 opacity-70", msg.senderRole === "admin" ? "text-right" : "")}>
                  {format(new Date(msg.createdAt), "h:mm a")}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="Type your admin reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="min-h-[60px] resize-none flex-1"
          />
          <Button size="icon" className="h-auto" onClick={() => replyMutation.mutate({ id: ticket.id, data: { message: reply } })} disabled={!reply || replyMutation.isPending}>
            <Send size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminTickets() {
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const { data = [], isLoading } = useAdminGetTickets(
    { status: filterStatus || undefined } as any,
    { query: { queryKey: getAdminGetTicketsQueryKey() } }
  );

  const tickets = data as any[];

  if (selectedTicket) {
    return (
      <AdminLayout>
        <PageHeader title="Support Tickets" description="Manage customer support" />
        <TicketDetail ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader title="Support Tickets" description={`${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}`} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: "", label: "All" },
          { value: "open", label: "Open" },
          { value: "in_progress", label: "In Progress" },
          { value: "resolved", label: "Resolved" },
          { value: "closed", label: "Closed" },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilterStatus(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              filterStatus === value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/30"
            }`}
          >
            {label}
          </button>
        ))}
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
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No tickets found</p>
            </div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket: any) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full p-4 flex items-start gap-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="bg-primary/10 text-primary p-2 rounded-full shrink-0 mt-0.5">
                    <MessageSquare size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{ticket.subject}</p>
                      <span className={cn("text-[10px] uppercase px-2 py-0.5 rounded-full font-medium shrink-0", STATUS_BADGE[ticket.status] || STATUS_BADGE.open)}>
                        {ticket.status?.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{ticket.category}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ticket.userEmail} · {format(new Date(ticket.createdAt), "MMM d, yyyy")}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
