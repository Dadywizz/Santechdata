import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useVerifyFunding } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "failed";

export default function PaymentCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [amount, setAmount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const verifyMutation = useVerifyFunding({
    mutation: {
      onSuccess: (data: any) => {
        setAmount(data.balance);
        setStatus("success");
      },
      onError: (error: any) => {
        setErrorMsg(error.data?.error || "Payment verification failed. Please contact support.");
        setStatus("failed");
      },
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Flutterwave params: tx_ref, transaction_id, status
    const txRef = params.get("tx_ref");
    const transactionId = params.get("transaction_id");
    const flwStatus = params.get("status");

    // Monnify params: paymentReference, transactionReference, paymentStatus
    const monnifyRef = params.get("paymentReference");
    const monnifyStatus = params.get("paymentStatus");

    const reference = txRef || monnifyRef;

    if (!reference) {
      setErrorMsg("Invalid payment callback. Missing reference.");
      setStatus("failed");
      return;
    }

    if (flwStatus === "cancelled" || monnifyStatus === "CANCELLED") {
      setErrorMsg("You cancelled the payment. No charge was made.");
      setStatus("failed");
      return;
    }

    if (monnifyStatus === "FAILED") {
      setErrorMsg("Payment failed. No charge was made to your wallet.");
      setStatus("failed");
      return;
    }

    verifyMutation.mutate({
      data: { reference, transactionId } as any,
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
            <h2 className="text-2xl font-bold">Verifying your payment...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your payment with Flutterwave.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-full p-4 w-24 h-24 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-14 w-14 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">Payment Successful!</h2>
            <p className="text-muted-foreground">
              Your wallet has been credited.
              {amount !== null && (
                <span className="block mt-1 font-semibold text-foreground">
                  New balance: ₦{Number(amount).toLocaleString()}
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
              <Button variant="outline" onClick={() => navigate("/fund-wallet")}>Fund Again</Button>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-4 w-24 h-24 mx-auto flex items-center justify-center">
              <XCircle className="h-14 w-14 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">Payment Failed</h2>
            <p className="text-muted-foreground">{errorMsg}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/fund-wallet")}>Try Again</Button>
              <Button variant="outline" onClick={() => navigate("/support")}>Contact Support</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
