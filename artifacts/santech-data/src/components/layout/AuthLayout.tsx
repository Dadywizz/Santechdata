import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border shadow-lg rounded-xl p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block cursor-pointer">
            <h1 className="text-3xl font-bold text-primary tracking-tight">SanTech Data</h1>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">Fast, modern VTU services</p>
        </div>
        {children}
      </div>
    </div>
  );
}
