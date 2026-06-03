import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetTickets, getGetTicketsQueryKey, useGetTicket, useCreateTicket, useReplyTicket } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, ArrowLeft, Phone, Send } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};

interface NewTicketFormProps {
  onClose: () => void;
  initialSubject?: string;
  initialMessage?: string;
  initialPriority?: "low" | "medium" | "high";
}

function NewTicketForm({ onClose, initialSubject = "", initialMessage = "", initialPriority = "medium" }: NewTicketFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(initialSubject);
  const [priority, setPriority] = useState<"low" | "medium" | "high">(initialPriority);
  const [message, setMessage] = useState(initialMessage);

  const mutation = useCreateTicket({
    mutation: {
      onSuccess: () => {
        toast({ title: "Complaint submitted!", description: "We'll review and respond within 24 hours." });
        queryClient.invalidateQueries({ queryKey: getGetTicketsQueryKey() });
        onClose();
      },
      onError: (error: any) => toast({ title: "Failed to submit", description: error.data?.error, variant: "destructive" }),
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft size={16} /></Button>
          <CardTitle>Submit a Complaint / Ticket</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="font-semibold mb-2 block">Subject</Label>
          <Input placeholder="Brief description of your issue" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-12" />
        </div>
        <div>
          <Label className="font-semibold mb-2 block">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High – Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="font-semibold mb-2 block">Details</Label>
          <Textarea
            placeholder="Describe your issue in detail — include amounts, dates and any reference numbers..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[140px] resize-none"
          />
        </div>
        <Button
          className="w-full"
          onClick={() => mutation.mutate({ data: { subject, priority, message } })}
          disabled={mutation.isPending || !subject || !message}
        >
          {mutation.isPending ? "Submitting..." : "Submit Complaint"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: ticket, isLoading } = useGetTicket(ticketId);

  const replyMutation = useReplyTicket({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTicketsQueryKey() });
        setReply("");
      },
      onError: (error: any) => toast({ title: "Failed to send reply", description: error.data?.error, variant: "destructive" }),
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4 animate-pulse">
          <div className="h-5 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const t = ticket as any;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={16} /></Button>
          <div>
            <CardTitle className="text-base">{t?.subject}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">{t?.priority} priority · {t?.status?.replace("_", " ")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(t?.messages ?? []).map((msg: any) => (
          <div
            key={msg.id}
            className={cn(
              "p-3 rounded-xl text-sm max-w-[85%]",
              msg.senderRole === "admin"
                ? "bg-primary/10 text-foreground ml-0"
                : "bg-muted text-foreground ml-auto"
            )}
          >
            <p className="font-medium text-xs text-muted-foreground mb-1 capitalize">{msg.senderRole === "admin" ? "Support Team" : "You"} · {format(new Date(msg.createdAt), "MMM d, h:mm a")}</p>
            <p className="whitespace-pre-wrap">{msg.message}</p>
          </div>
        ))}

        {t?.status !== "closed" && t?.status !== "resolved" && (
          <div className="flex gap-2 pt-2">
            <Textarea
              placeholder="Type your reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="resize-none min-h-[80px] text-sm"
            />
            <Button
              size="icon"
              className="h-auto"
              onClick={() => replyMutation.mutate({ id: ticketId, data: { message: reply } })}
              disabled={!reply || replyMutation.isPending}
            >
              <Send size={16} />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Support() {
  const params = new URLSearchParams(window.location.search);
  const prefillSubject = params.get("subject") || "";
  const prefillMessage = params.get("message") || "";
  const prefillPriority = (params.get("priority") as "low" | "medium" | "high") || "medium";
  const hasPreFill = Boolean(prefillSubject || prefillMessage);

  const [view, setView] = useState<"list" | "new" | "detail">(hasPreFill ? "new" : "list");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data, isLoading } = useGetTickets({ query: { queryKey: getGetTicketsQueryKey() } });
  const tickets = (data as any) ?? [];

  if (view === "new") {
    return (
      <AppLayout>
        <PageHeader title="Support" description="Get help from our team" />
        <NewTicketForm
          onClose={() => setView("list")}
          initialSubject={prefillSubject}
          initialMessage={prefillMessage}
          initialPriority={prefillPriority}
        />
      </AppLayout>
    );
  }

  if (view === "detail" && selectedTicketId) {
    return (
      <AppLayout>
        <PageHeader title="Support" description="Get help from our team" />
        <TicketDetail ticketId={selectedTicketId} onBack={() => setView("list")} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Support" description="Get help from our team" />
        <Button onClick={() => setView("new")}>
          <Plus className="mr-2 h-4 w-4" /> New Ticket
        </Button>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
        <Phone className="text-primary shrink-0" size={20} />
        <div className="space-y-0.5">
          <p className="font-semibold text-sm">Need urgent help?</p>
          <p className="text-sm text-muted-foreground">Call or WhatsApp: <a href="tel:09026329296" className="text-primary font-medium">09026329296</a></p>
          <p className="text-sm text-muted-foreground">Email: <a href="mailto:santechdata@gmail.com" className="text-primary font-medium">santechdata@gmail.com</a></p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2].map((i) => (
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
              <p className="font-medium">No support tickets</p>
              <p className="text-sm mt-1">Click "New Ticket" to get help from our team</p>
            </div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket: any) => (
                <button
                  key={ticket.id}
                  onClick={() => { setSelectedTicketId(ticket.id); setView("detail"); }}
                  className="w-full p-4 flex items-start gap-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="bg-primary/10 text-primary p-2 rounded-full shrink-0 mt-0.5">
                    <MessageSquare size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{ticket.subject}</p>
                      <span className={cn("text-[10px] uppercase px-2 py-0.5 rounded-full font-medium shrink-0", STATUS_BADGE[ticket.status] || STATUS_BADGE.open)}>
                        {ticket.status?.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">{ticket.priority} priority · {format(new Date(ticket.createdAt), "MMM d, yyyy")}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
