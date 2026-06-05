import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useVerifyFunding } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type Status = "loading" | "success" | "failed" | "processing";

const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 15_000;

export default function PaymentCallback() {
  const [, navigate] = useLocation();
  const { isInitialized, token } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [amount, setAmount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const hasVerified = useRef(false);
  const pollAttemptsRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const referenceRef = useRef("");
  const transactionIdRef = useRef<string | undefined>(undefined);

  const verifyMutation = useVerifyFunding({
    mutation: {
      onSuccess: (data: any) => {
        clearTimers();
        localStorage.removeItem("santech_pending_payment");
        setAmount(data.balance);
        setStatus("success");
      },
      onError: (error: any) => {
        const errMsg = (error.data?.error as string) || "";

        if (error.status === 401 || errMsg.toLowerCase().includes("unauthorized")) {
          clearTimers();
          const params = window.location.search;
          localStorage.setItem("santech_pending_payment", params);
          navigate(`/login?returnTo=${encodeURIComponent("/payment/callback" + params)}`);
          return;
        }

        if (error.status === 202) {
          setErrorMsg("Waiting for your bank transfer to be confirmed by Paystack...");
          setStatus("processing");
          schedulePoll();
          return;
        }

        clearTimers();
        setErrorMsg(errMsg || "Payment verification failed. Please contact support.");
        setStatus("failed");
      },
    },
  });

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  }, []);

  const triggerVerify = useCallback(() => {
    verifyMutation.mutate({
      data: { reference: referenceRef.current, transactionId: transactionIdRef.current } as any,
    });
  }, []);

  const schedulePoll = useCallback(() => {
    pollAttemptsRef.current += 1;
    setPollCount(pollAttemptsRef.current);

    if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
      setErrorMsg("Your transfer is taking longer than expected. Your wallet will be credited automatically once confirmed — check back in a few minutes or contact support with your reference: " + referenceRef.current);
      setStatus("failed");
      return;
    }

    setCountdown(POLL_INTERVAL_MS / 1000);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    pollTimerRef.current = setTimeout(() => {
      triggerVerify();
    }, POLL_INTERVAL_MS);
  }, [triggerVerify]);

  useEffect(() => {
    if (!isInitialized) return;
    if (hasVerified.current) return;

    const params = new URLSearchParams(window.location.search);

    const txRef = params.get("tx_ref");
    const transactionId = params.get("transaction_id") || undefined;
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
    referenceRef.current = reference;
    transactionIdRef.current = transactionId;
    triggerVerify();
  }, [isInitialized, token]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

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

        {status === "processing" && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-full p-4 w-24 h-24 mx-auto flex items-center justify-center">
              <Loader2 className="h-14 w-14 text-blue-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400">Transfer Processing</h2>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2">
              ✓ Transfer detected — waiting for bank confirmation
            </p>
            <p className="text-muted-foreground text-center text-sm">{errorMsg}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {countdown > 0
                ? <span>Checking again in <span className="font-semibold text-foreground">{countdown}s</span>...</span>
                : <span>Checking now...</span>
              }
              <span className="text-xs">({pollCount}/{MAX_POLL_ATTEMPTS})</span>
            </div>
            <p className="text-xs text-muted-foreground">Stay on this page. Your wallet will update automatically.</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
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
