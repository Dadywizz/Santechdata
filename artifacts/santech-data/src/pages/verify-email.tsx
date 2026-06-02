import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useVerifyEmail, useResendOtp } from "@workspace/api-client-react";
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

const verifyEmailSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;

export default function VerifyEmail() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const form = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      otp: "",
    },
  });

  const verifyMutation = useVerifyEmail({
    mutation: {
      onSuccess: () => {
        if (user) {
          updateUser({ ...user, emailVerified: true });
        }
        toast({
          title: "Email verified",
          description: "Your account is now fully active.",
        });
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({
          title: "Verification failed",
          description: (error.data as any)?.error || "Invalid OTP. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const resendMutation = useResendOtp({
    mutation: {
      onSuccess: () => {
        toast({
          title: "OTP Resent",
          description: "Check your email for the new code.",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to resend",
          description: (error.data as any)?.error || "Could not resend OTP. Please try again later.",
          variant: "destructive",
        });
      },
    }
  });

  function onSubmit(data: VerifyEmailFormValues) {
    if (!user?.email) {
      toast({ title: "Error", description: "Email not found. Please log in again.", variant: "destructive" });
      return;
    }
    verifyMutation.mutate({ 
      data: {
        email: user.email,
        otp: data.otp
      }
    });
  }

  function handleResend() {
    if (!user?.email) return;
    resendMutation.mutate({ data: { email: user.email } });
  }

  if (user && user.emailVerified) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Verify your email</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We sent a 6-digit code to <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>One-Time Password</FormLabel>
                  <FormControl>
                    <Input placeholder="123456" maxLength={6} {...field} disabled={verifyMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? "Verifying..." : "Verify email"}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          Didn't receive the code?{" "}
          <button 
            type="button"
            onClick={handleResend}
            disabled={resendMutation.isPending}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            {resendMutation.isPending ? "Resending..." : "Resend"}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
