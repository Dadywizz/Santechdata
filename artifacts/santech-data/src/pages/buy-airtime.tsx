import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PhoneOff } from "lucide-react";

export default function BuyAirtime() {
  return (
    <AppLayout>
      <PageHeader title="Buy Airtime" description="Instant airtime recharge for all networks" />

      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6">
          <PhoneOff className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Airtime Not Available</h2>
        <p className="text-muted-foreground mb-2 leading-relaxed">
          Airtime recharge is currently unavailable on our platform.
        </p>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Please contact us directly on <strong>09026329296</strong> or via WhatsApp for assistance.
        </p>
        <a href="https://wa.me/2348063136201" target="_blank" rel="noopener noreferrer">
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 px-8">
            Chat on WhatsApp
          </Button>
        </a>
      </div>
    </AppLayout>
  );
}
