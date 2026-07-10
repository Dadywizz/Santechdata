import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminGetExamTypes, getAdminGetExamTypesQueryKey, useAdminUpdateExamType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Pencil, RefreshCw } from "lucide-react";

const EXAM_COLORS: Record<string, string> = {
  WAEC: "bg-blue-600 text-white",
  NECO: "bg-emerald-600 text-white",
  JAMB: "bg-orange-600 text-white",
  NABTEB: "bg-purple-600 text-white",
};

function ExamForm({ examType, onClose }: { examType: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: examType?.name || "",
    price: examType?.price?.toString() || "",
    costPrice: examType?.costPrice != null ? examType.costPrice.toString() : "",
    description: examType?.description || "",
  });

  const updateMutation = useAdminUpdateExamType({
    mutation: {
      onSuccess: () => {
        toast({ title: "Exam pricing updated" });
        queryClient.invalidateQueries({ queryKey: getAdminGetExamTypesQueryKey() });
        onClose();
      },
      onError: (e: any) => toast({ title: "Failed", description: e.data?.error, variant: "destructive" }),
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate({
      id: examType.id,
      data: {
        name: form.name,
        price: parseFloat(form.price),
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        description: form.description || null,
      } as any,
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div>
        <Label className="font-semibold mb-2 block">Display Name</Label>
        <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-12" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="font-semibold mb-2 block">Selling Price (₦)</Label>
          <Input type="number" placeholder="0.00" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} className="h-12" />
        </div>
        <div>
          <Label className="font-semibold mb-2 block">Cost Price (₦)</Label>
          <Input type="number" placeholder="0.00" value={form.costPrice} onChange={(e) => setForm(f => ({ ...f, costPrice: e.target.value }))} className="h-12" />
        </div>
      </div>
      <div>
        <Label className="font-semibold mb-2 block">Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "Saving..." : "Save Pricing"}
      </Button>
    </div>
  );
}

export default function AdminExams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editExam, setEditExam] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  const { data = [], isLoading } = useAdminGetExamTypes({ query: { queryKey: getAdminGetExamTypesQueryKey() } });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = sessionStorage.getItem("santech_token");
      const res = await fetch("/api/admin/seed-exam-types", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) {
        toast({ title: "Sync failed", description: data.error ?? "Unknown error", variant: "destructive" });
      } else {
        toast({ title: "Exam types synced", description: data.message });
        queryClient.invalidateQueries({ queryKey: getAdminGetExamTypesQueryKey() });
      }
    } catch {
      toast({ title: "Sync failed", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const exams = data as any[];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <PageHeader title="Exam Pricing" description="Manage prices for WAEC, NECO, JAMB & NABTEB result checkers" />
        <Button variant="outline" onClick={handleSync} disabled={syncing} title="Make sure all 4 exam boards exist (WAEC, NECO, JAMB, NABTEB)">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync Exam Boards"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No exam types found</p>
              <p className="text-sm mt-1">Click "Sync Exam Boards" to add WAEC, NECO, JAMB & NABTEB.</p>
            </div>
          ) : (
            <div className="divide-y">
              {exams.map((exam: any) => (
                <div key={exam.id} className="p-4 flex items-center gap-4 flex-wrap">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${EXAM_COLORS[exam.code] || "bg-muted"}`}>
                    {exam.code.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{exam.name}</p>
                    <p className="text-sm text-muted-foreground">{exam.description || exam.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₦{exam.price?.toLocaleString()}</p>
                    {exam.costPrice != null ? (
                      <p className="text-xs text-muted-foreground">Cost: ₦{exam.costPrice?.toLocaleString()}</p>
                    ) : (
                      <p className="text-xs text-slate-300">Cost: —</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditExam(exam)}>
                    <Pencil size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editExam} onOpenChange={() => setEditExam(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editExam?.name} Pricing</DialogTitle>
          </DialogHeader>
          {editExam && <ExamForm examType={editExam} onClose={() => setEditExam(null)} />}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
