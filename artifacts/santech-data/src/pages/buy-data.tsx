import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useGetDataPlans, getGetDataPlansQueryKey, usePurchaseData, DataPlanNetwork, DataPlan } from "@workspace/api-client-react";
import { Check, Wifi } from "lucide-react";
import { Label } from "@/components/ui/label";

const NETWORKS = [
  { id: DataPlanNetwork.MTN, name: "MTN", color: "bg-[#FFCB00] text-black", border: "border-[#FFCB00]" },
  { id: DataPlanNetwork.AIRTEL, name: "Airtel", color: "bg-[#E40000] text-white", border: "border-[#E40000]" },
  { id: DataPlanNetwork.GLO, name: "Glo", color: "bg-[#008000] text-white", border: "border-[#008000]" },
  { id: DataPlanNetwork["9MOBILE"], name: "9Mobile", color: "bg-[#006633] text-white", border: "border-[#006633]" },
];

export default function BuyData() {
  const { toast } = useToast();
  const [network, setNetwork] = useState<DataPlanNetwork | null>(null);
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);

  const { data: plans = [], isLoading: isLoadingPlans } = useGetDataPlans(
    { network: network || undefined },
    { query: { enabled: !!network, queryKey: getGetDataPlansQueryKey({ network: network || undefined }) } }
  );

  const purchaseMutation = usePurchaseData({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Purchase Successful",
          description: `Data successfully sent to ${phone}`,
        });
        setPhone("");
        setSelectedPlan(null);
      },
      onError: (error: any) => {
        toast({
          title: "Purchase Failed",
          description: error.data?.error || "Could not complete purchase",
          variant: "destructive",
        });
      }
    }
  });

  const handlePurchase = () => {
    if (!selectedPlan) return;
    if (phone.length < 10) {
      toast({ title: "Invalid phone number", variant: "destructive" });
      return;
    }
    
    purchaseMutation.mutate({
      data: {
        planId: selectedPlan.id,
        phone
      }
    });
  };

  return (
    <AppLayout>
      <PageHeader title="Buy Data" description="Instant data top-up for all networks" />

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Network</Label>
            <div className="grid grid-cols-2 gap-3">
              {NETWORKS.map(net => (
                <button
                  key={net.id}
                  onClick={() => {
                    setNetwork(net.id);
                    setSelectedPlan(null);
                  }}
                  className={`relative overflow-hidden rounded-xl p-4 flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                    network === net.id 
                      ? `${net.border} shadow-md` 
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${net.color}`}>
                    {net.name[0]}
                  </div>
                  <span className="font-medium text-sm">{net.name}</span>
                  {network === net.id && (
                    <div className={`absolute top-2 right-2 ${net.color} w-5 h-5 rounded-full flex items-center justify-center`}>
                      <Check size={12} className={net.name === 'MTN' ? 'text-black' : 'text-white'} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Phone Number</Label>
            <Input 
              type="tel" 
              placeholder="e.g. 08012345678" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Label className="text-base font-semibold mb-3 block">Select Data Plan</Label>
          
          {!network ? (
            <div className="h-64 rounded-xl border border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
              <Wifi size={48} className="mb-4 opacity-20" />
              <p>Select a network to view available plans</p>
            </div>
          ) : isLoadingPlans ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1,2,3,4,5,6].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24 bg-muted/50 rounded-xl" />
                </Card>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border rounded-xl">
              No plans available for this network currently.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selectedPlan?.id === plan.id 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-border bg-card hover:border-primary/30 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg">{plan.size}</span>
                    <span className="font-bold text-primary">₦{plan.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{plan.validity}</span>
                    <span>{plan.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedPlan && (
            <Card className="mt-6 border-primary/20 bg-primary/5 shadow-sm">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">You are about to purchase</p>
                  <p className="font-bold text-lg">{selectedPlan.size} for {phone || '...'}</p>
                </div>
                <Button 
                  size="lg" 
                  onClick={handlePurchase}
                  disabled={purchaseMutation.isPending || !phone}
                  className="w-full sm:w-auto"
                >
                  {purchaseMutation.isPending ? "Processing..." : `Pay ₦${selectedPlan.price.toLocaleString()}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
