import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Fingerprint, Loader2 } from "lucide-react";
import {
  loginWithFingerprint,
  hasFingerprintRegistered,
} from "@/hooks/useWebAuthn";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login: setAuth } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [logoutReason, setLogoutReason] = useState<"idle" | "expired" | null>(null);
  const [fingerprintEmail, setFingerprintEmail] = useState<string | null>(null);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || "";

  useEffect(() => {
    const reason = sessionStorage.getItem("santech_idle_logout");
    if (reason === "idle" || reason === "expired") {
      sessionStorage.removeItem("santech_idle_logout");
      setLogoutReason(reason);
    }
    setFingerprintEmail(hasFingerprintRegistered());
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setLogoutReason(null);
        setAuth(data);
        toast({ title: "Welcome back", description: "You have successfully logged in." });
        if (returnTo) navigate(returnTo);
      },
      onError: (error) => {
        toast({
          title: "Login failed",
          description: error.data?.error || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  async function handleFingerprintLogin() {
    if (!fingerprintEmail) return;
    setFingerprintLoading(true);
    try {
      const data = await loginWithFingerprint(fingerprintEmail);
      setAuth(data);
      toast({ title: "Welcome back!", description: "Signed in with fingerprint." });
      if (returnTo) navigate(returnTo);
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("cancel") || msg.includes("not allowed") || msg.includes("abort")) {
        // user dismissed — silent
      } else {
        toast({ title: "Fingerprint sign-in failed", description: msg || "Please try your password instead.", variant: "destructive" });
      }
    } finally {
      setFingerprintLoading(false);
    }
  }

  function onSubmit(data: LoginFormValues) {
    loginMutation.mutate({ data });
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {logoutReason && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
            {logoutReason === "expired"
              ? "Your session expired after 10 minutes. Please sign in again."
              : "You were signed out after 10 minutes of inactivity. Please sign in again."}
          </div>
        )}

        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and password to access your account
          </p>
        </div>

        {/* Fingerprint quick-login — shown if registered on this device */}
        {fingerprintEmail && (
          <div className="rounded-xl border-2 border-blue-100 bg-blue-50 p-4 text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
                <Fingerprint className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Sign in with Fingerprint</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{fingerprintEmail}</p>
            </div>
            <Button
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={handleFingerprintLogin}
              disabled={fingerprintLoading}
            >
              {fingerprintLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                : <><Fingerprint className="h-4 w-4" /> Use Fingerprint</>
              }
            </Button>
            <p className="text-xs text-slate-400">or sign in with password below</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" type="email" {...field} disabled={loginMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} disabled={loginMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
