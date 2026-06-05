import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useGetExamTypes, usePurchaseExamToken } from "@workspace/api-client-react";
import { BookOpen, Check } from "lucide-react";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";

const EXAM_COLORS: Record<string, string> = {
  WAEC: "bg-blue-600",
  NECO: "bg-green-700",
  JAMB: "bg-red-600",
  NABTEB: "bg-purple-700",
};

export default function BuyExam() {
  const { toast } = useToast();
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const { data: examTypes = [] } = useGetExamTypes();

  const mutation = usePurchaseExamToken({
    mutation: {
      onSuccess: (tx: any) => {
        setReceipt({
          reference: tx.reference,
          description: tx.description,
          amount: tx.amount,
          examType: (tx.metadata as any)?.examType,
          quantity: (tx.metadata as any)?.quantity,
          phone: (tx.metadata as any)?.phone,
          tokens: (tx.metadata as any)?.tokens,
          createdAt: tx.createdAt,
          type: "exam",
        });
        setSelectedExam(""); setQuantity(1);
      },
      onError: (error: any) => {
        toast({ title: "Purchase Failed", description: error.data?.error || "Could not generate token", variant: "destructive" });
      },
    },
  });

  const exam = (examTypes as any[]).find((e: any) => e.code === selectedExam);

  const handlePurchase = () => {
    if (!exam) { toast({ title: "Select an exam type", variant: "destructive" }); return; }
    if (!phone || phone.length < 10) { toast({ title: "Enter a valid phone number", variant: "destructive" }); return; }
    mutation.mutate({ data: { examTypeId: exam.id, quantity, phone } });
  };

  return (
    <AppLayout>
      <PageHeader title="Exam Tokens" description="WAEC, NECO, JAMB & NABTEB scratch cards" />

      <div className="max-w-2xl space-y-6">
        <div>
          <Label className="text-base font-semibold mb-3 block">Select Exam Type</Label>
          <div className="grid grid-cols-2 gap-4">
            {(examTypes as any[]).map((exam: any) => (
              <button
                key={exam.code}
                onClick={() => setSelectedExam(exam.code)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                  selectedExam === exam.code ? "border-primary shadow-md" : "border-border hover:border-primary/30 bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${EXAM_COLORS[exam.code] || "bg-slate-600"}`}>
                    <BookOpen className="text-white" size={22} />
                  </div>
                  <div>
                    <p className="font-bold">{exam.code}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{exam.name}</p>
                    <p className="font-semibold text-primary mt-1">₦{exam.price?.toLocaleString()}</p>
                  </div>
                </div>
                {selectedExam === exam.code && (
                  <div className="absolute top-3 right-3 bg-primary w-6 h-6 rounded-full flex items-center justify-center">
                    <Check size={13} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedExam && exam && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Order Summary</h3>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Exam type</span>
                <span className="font-semibold">{exam.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Price per token</span>
                <span className="font-semibold">₦{exam.price?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border-2 border-border font-bold flex items-center justify-center hover:border-primary"
                  >
                    -
                  </button>
                  <span className="font-bold text-lg w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(5, quantity + 1))}
                    className="w-8 h-8 rounded-full border-2 border-border font-bold flex items-center justify-center hover:border-primary"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="font-bold text-xl text-primary">₦{(exam.price * quantity).toLocaleString()}</span>
              </div>
              <Button size="lg" className="w-full" onClick={handlePurchase} disabled={mutation.isPending}>
                {mutation.isPending ? "Generating Token..." : `Generate Token — ₦${(exam.price * quantity).toLocaleString()}`}
              </Button>
              <div>
                <Label className="font-semibold mb-2 block">Phone Number</Label>
                <input
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">Tokens will be sent to your registered email address</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} data={receipt} />
    </AppLayout>
  );
}
