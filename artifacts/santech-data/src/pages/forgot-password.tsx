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
import { CheckCircle2, Send } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  otp: z.string().length(6, "Enter the 6-digit code"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [codeSent, setCodeSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", otp: "", password: "", confirmPassword: "" },
  });

  const forgotMutation = useForgotPassword({
    mutation: {
      onSuccess: () => {
        const email = form.getValues("email");
        setSentTo(email);
        setCodeSent(true);
        toast({ title: "Code sent!", description: `Check ${email} for a 6-digit code.` });
      },
      onError: (error) => {
        toast({
          title: "Failed to send code",
          description: (error.data as any)?.error || "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const resetMutation = useResetPassword({
    mutation: {
      onSuccess: () => {
        toast({ title: "Password reset!", description: "You can now log in with your new password." });
        setLocation("/login");
      },
      onError: (error) => {
        toast({
          title: "Reset failed",
          description: (error.data as any)?.error || "Invalid or expired code. Please request a new one.",
          variant: "destructive",
        });
      },
    },
  });

  const sendCode = () => {
    const email = form.getValues("email");
    const emailValid = z.string().email().safeParse(email);
    if (!emailValid.success) {
      form.setError("email", { message: "Enter a valid email address" });
      return;
    }
    forgotMutation.mutate({ data: { email } });
  };

  const onSubmit = (data: FormValues) => {
    if (!codeSent) {
      toast({ title: "Send the code first", description: "Click 'Send Code' next to your email.", variant: "destructive" });
      return;
    }
    resetMutation.mutate({ data: { token: data.otp, password: data.password } });
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reset Password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email, get a code, then set a new password
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Email + Send Code */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="name@example.com"
                        type="email"
                        {...field}
                        disabled={codeSent || forgotMutation.isPending}
                        className="flex-1"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant={codeSent ? "outline" : "default"}
                      onClick={sendCode}
                      disabled={forgotMutation.isPending || codeSent}
                      className="shrink-0 gap-1"
                    >
                      {forgotMutation.isPending ? (
                        "Sending..."
                      ) : codeSent ? (
                        <><CheckCircle2 size={14} className="text-green-500" /> Sent</>
                      ) : (
                        <><Send size={14} /> Send Code</>
                      )}
                    </Button>
                  </div>
                  {codeSent && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      ✓ Code sent to {sentTo} — check your inbox (and spam folder)
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* OTP Code */}
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>6-Digit Code from Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="• • • • • •"
                      maxLength={6}
                      inputMode="numeric"
                      className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                      {...field}
                      disabled={resetMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Minimum 8 characters"
                      type="password"
                      {...field}
                      disabled={resetMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Repeat your new password"
                      type="password"
                      {...field}
                      disabled={resetMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
