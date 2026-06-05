import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useVerifyFunding } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type Status = "loading" | "success" | "failed";

export default function PaymentCallback() {
  const [, navigate] = useLocation();
  const { isInitialized, token } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [amount, setAmount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const hasVerified = useRef(false);

  const verifyMutation = useVerifyFunding({
    mutation: {
      onSuccess: (data: any) => {
        localStorage.removeItem("santech_pending_payment");
        setAmount(data.balance);
        setStatus("success");
      },
      onError: (error: any) => {
        const errMsg = (error.data?.error as string) || "";
        if (error.status === 401 || errMsg.toLowerCase().includes("unauthorized")) {
          const params = window.location.search;
          localStorage.setItem("santech_pending_payment", params);
          navigate(`/login?returnTo=${encodeURIComponent("/payment/callback" + params)}`);
          return;
        }
        setErrorMsg(errMsg || "Payment verification failed. Please contact support.");
        setStatus("failed");
      },
    },
  });

  useEffect(() => {
    if (!isInitialized) return;
    if (hasVerified.current) return;

    const params = new URLSearchParams(window.location.search);

    const txRef = params.get("tx_ref");
    const transactionId = params.get("transaction_id");
    const flwStatus = params.get("status");

    const monnifyRef = params.get("paymentReference");
    const monnifyStatus = params.get("paymentStatus");

    const paystackRef = params.get("reference") || params.get("trxref");

    const reference = txRef || monnifyRef || paystackRef;

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

    if (!token) {
      localStorage.setItem("santech_pending_payment", window.location.search);
      navigate(`/login?returnTo=${encodeURIComponent("/payment/callback" + window.location.search)}`);
      return;
    }

    hasVerified.current = true;
    verifyMutation.mutate({
      data: { reference, transactionId } as any,
    });
  }, [isInitialized, token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
            <h2 className="text-2xl font-bold">Verifying your payment...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
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
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-full p-4 w-24 h-24 mx-auto flex items-center justify-center">
              <XCircle className="h-14 w-14 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-orange-700 dark:text-orange-400">Payment Not Completed</h2>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2">
              ✓ No money was taken from you
            </p>
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
