import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Printer, Share2 } from "lucide-react";

export interface ReceiptData {
  reference: string;
  description: string;
  amount: number;
  network?: string;
  phone?: string;
  size?: string;
  validity?: string;
  provider?: string;
  plan?: string;
  meterNumber?: string;
  token?: string;
  examType?: string;
  tokens?: string[];
  quantity?: number;
  createdAt: string;
  type: string;
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export function ReceiptModal({ open, onClose, data }: ReceiptModalProps) {
  if (!data) return null;

  const typeLabel: Record<string, string> = {
    data: "Data Purchase",
    airtime: "Airtime Recharge",
    electricity: "Electricity Token",
    cable: "Cable Subscription",
    exam: "Exam Token",
  };

  const date = new Date(data.createdAt);
  const formattedDate = date.toLocaleDateString("en-NG", { day: "2-digit", month: "long", year: "numeric" });
  const formattedTime = date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });

  const handlePrint = () => window.print();

  const handleShare = () => {
    const lines = [
      `🧾 SanTech Data Receipt`,
      `Type: ${typeLabel[data.type] ?? data.type}`,
      `Amount: ₦${Number(data.amount).toLocaleString()}`,
      data.network ? `Network: ${data.network}` : "",
      data.phone ? `Phone: ${data.phone}` : "",
      data.size ? `Data: ${data.size}` : "",
      data.validity ? `Validity: ${data.validity}` : "",
      data.provider ? `Provider: ${data.provider}` : "",
      data.plan ? `Plan: ${data.plan}` : "",
      data.meterNumber ? `Meter: ${data.meterNumber}` : "",
      data.token ? `Token: ${data.token}` : "",
      data.examType ? `Exam: ${data.examType}` : "",
      ...(data.tokens ?? []).map((t, i) => `Token ${i + 1}: ${t}`),
      `Date: ${formattedDate} ${formattedTime}`,
      `Ref: ${data.reference}`,
      `Status: Successful ✓`,
      `Contact: 09026329296`,
    ].filter(Boolean).join("\n");

    if (navigator.share) {
      navigator.share({ title: "SanTech Data Receipt", text: lines }).catch(() => {});
    } else {
      navigator.clipboard.writeText(lines)
        .then(() => alert("Receipt copied to clipboard!"))
        .catch(() => {});
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm print:shadow-none">
        <DialogHeader>
          <DialogTitle className="sr-only">Purchase Receipt</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <CheckCircle2 className="text-green-600" size={36} />
          </div>
          <h2 className="text-xl font-bold">Purchase Successful!</h2>
          <p className="text-muted-foreground text-sm mt-1">{typeLabel[data.type] ?? data.type}</p>
        </div>

        <div className="border rounded-xl divide-y text-sm">
          <div className="flex justify-between px-4 py-3">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-bold text-lg text-primary">₦{Number(data.amount).toLocaleString()}</span>
          </div>
          {data.network && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Network</span>
              <span className="font-semibold">{data.network}</span>
            </div>
          )}
          {data.phone && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-semibold">{data.phone}</span>
            </div>
          )}
          {data.size && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Data Size</span>
              <span className="font-semibold">{data.size}</span>
            </div>
          )}
          {data.validity && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Validity</span>
              <span className="font-semibold">{data.validity}</span>
            </div>
          )}
          {data.provider && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-semibold">{data.provider}</span>
            </div>
          )}
          {data.plan && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-semibold text-right max-w-[60%]">{data.plan}</span>
            </div>
          )}
          {data.meterNumber && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Meter Number</span>
              <span className="font-semibold">{data.meterNumber}</span>
            </div>
          )}
          {data.token && (
            <div className="px-4 py-3">
              <span className="text-muted-foreground block mb-1">Electricity Token</span>
              <span className="font-mono font-bold text-base tracking-widest text-primary break-all">{data.token}</span>
            </div>
          )}
          {data.examType && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Exam Type</span>
              <span className="font-semibold">{data.examType}</span>
            </div>
          )}
          {data.quantity && data.quantity > 1 && (
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-semibold">{data.quantity}</span>
            </div>
          )}
          {(data.tokens ?? []).map((t, i) => (
            <div key={i} className="px-4 py-3">
              <span className="text-muted-foreground block mb-1">
                {(data.tokens?.length ?? 0) > 1 ? `Token ${i + 1}` : "Token / PIN"}
              </span>
              <span className="font-mono font-bold text-sm tracking-widest text-primary break-all">{t}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3">
            <span className="text-muted-foreground">Date</span>
            <span className="font-semibold">{formattedDate}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-muted-foreground">Time</span>
            <span className="font-semibold">{formattedTime}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-muted-foreground">Status</span>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Successful</Badge>
          </div>
          <div className="px-4 py-3">
            <span className="text-muted-foreground block mb-1">Reference</span>
            <span className="font-mono text-xs break-all">{data.reference}</span>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-1">
          Keep this reference for any disputes. Contact support at 09026329296.
        </p>

        <div className="flex gap-3 mt-2">
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 size={16} className="mr-2" /> Share
          </Button>
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer size={16} className="mr-2" /> Print
          </Button>
          <Button className="flex-1" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
