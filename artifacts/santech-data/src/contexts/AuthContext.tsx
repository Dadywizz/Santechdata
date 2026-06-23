import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { User, AuthResponse } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = sessionStorage.getItem("santech_token");
    const storedUser = sessionStorage.getItem("santech_user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        sessionStorage.removeItem("santech_token");
        sessionStorage.removeItem("santech_user");
      }
    }
    // Also clear any stale localStorage tokens from old sessions
    localStorage.removeItem("santech_token");
    localStorage.removeItem("santech_user");
    setIsInitialized(true);
  }, []);

  // ── Inactivity auto-logout ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    let timer: ReturnType<typeof setTimeout>;

    const handleActivity = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem("santech_idle_logout", "1");
        sessionStorage.removeItem("santech_token");
        sessionStorage.removeItem("santech_user");
        setToken(null);
        setUser(null);
        setLocation("/login");
      }, INACTIVITY_MS);
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    handleActivity(); // start timer immediately on login

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [token, setLocation]);

  const login = (data: AuthResponse) => {
    sessionStorage.setItem("santech_token", data.token);
    sessionStorage.setItem("santech_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    sessionStorage.removeItem("santech_token");
    sessionStorage.removeItem("santech_user");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  const updateUser = (updatedUser: User) => {
    sessionStorage.setItem("santech_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, isInitialized, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
