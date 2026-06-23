import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { useForgotPassword, useResetPassword } from "@workspace/api-client-react";
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
import { Mail, CheckCircle } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetSchema = z.object({
  otp: z.string().min(6, "Enter the 6-digit code from your email").max(6),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [sentEmail, setSentEmail] = useState("");

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", password: "", confirmPassword: "" },
  });

  const forgotMutation = useForgotPassword({
    mutation: {
      onSuccess: () => {
        setSentEmail(emailForm.getValues("email"));
        setStep("otp");
      },
      onError: (error) => {
        toast({
          title: "Request failed",
          description: (error.data as any)?.error || "Could not process request. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const resetMutation = useResetPassword({
    mutation: {
      onSuccess: () => {
        toast({ title: "Password reset successful", description: "You can now log in with your new password." });
        setLocation("/login");
      },
      onError: (error) => {
        toast({
          title: "Reset failed",
          description: (error.data as any)?.error || "Invalid or expired code. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  if (step === "otp") {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
              <Mail className="h-7 w-7 text-orange-500" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <strong>{sentEmail}</strong>.<br />
              Enter it below along with your new password.
            </p>
          </div>

          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit((data) => resetMutation.mutate({ data: { token: data.otp, password: data.password } }))} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>6-Digit Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123456"
                        maxLength={6}
                        className="text-center text-2xl tracking-widest font-mono h-14"
                        {...field}
                        disabled={resetMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resetForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" {...field} disabled={resetMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" {...field} disabled={resetMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
                {resetMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm text-muted-foreground">
            Didn't receive the email?{" "}
            <button
              className="text-primary hover:underline font-medium"
              onClick={() => { setStep("email"); emailForm.reset(); resetForm.reset(); }}
            >
              Try again
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Forgot Password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we'll send you a reset code
          </p>
        </div>

        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit((data) => forgotMutation.mutate({ data }))} className="space-y-4">
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" type="email" {...field} disabled={forgotMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={forgotMutation.isPending}>
              {forgotMutation.isPending ? "Sending..." : "Send Reset Code"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
