import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Printer, X } from "lucide-react";

export interface ReceiptData {
  reference: string;
  description: string;
  amount: number;
  network?: string;
  phone?: string;
  size?: string;
  validity?: string;
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

  const handlePrint = () => {
    window.print();
  };

  const date = new Date(data.createdAt);
  const formattedDate = date.toLocaleDateString("en-NG", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-NG", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const typeLabel: Record<string, string> = {
    data: "Data Purchase",
    airtime: "Airtime Recharge",
    electricity: "Electricity Token",
    cable: "Cable Subscription",
    exam: "Exam Token",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
            <span className="text-muted-foreground">Amount</span>
            <span className="font-bold text-lg text-primary">₦{data.amount.toLocaleString()}</span>
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
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Success</Badge>
          </div>
          <div className="px-4 py-3">
            <span className="text-muted-foreground block mb-1">Reference</span>
            <span className="font-mono text-xs break-all">{data.reference}</span>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Keep this reference for any disputes. Contact support at 09026329296.
        </p>

        <div className="flex gap-3 mt-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer size={16} className="mr-2" /> Print
          </Button>
          <Button className="flex-1" onClick={onClose}>
            <X size={16} className="mr-2" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
