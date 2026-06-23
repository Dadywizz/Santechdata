import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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

const SESSION_MS = 10 * 60 * 1000; // 10 minutes hard session limit
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

function doLogout(reason: "idle" | "expired") {
  sessionStorage.setItem("santech_idle_logout", reason);
  sessionStorage.removeItem("santech_token");
  sessionStorage.removeItem("santech_user");
  sessionStorage.removeItem("santech_login_time");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setLocation] = useLocation();
  const hardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performLogout = (reason: "idle" | "expired") => {
    doLogout(reason);
    if (hardTimerRef.current) clearTimeout(hardTimerRef.current);
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  // Start hard 10-min session timer (absolute, not reset by activity)
  const startHardTimer = (remainingMs: number) => {
    if (hardTimerRef.current) clearTimeout(hardTimerRef.current);
    hardTimerRef.current = setTimeout(() => {
      performLogout("expired");
    }, remainingMs);
  };

  useEffect(() => {
    const storedToken = sessionStorage.getItem("santech_token");
    const storedUser = sessionStorage.getItem("santech_user");
    const loginTime = sessionStorage.getItem("santech_login_time");

    // Clear any stale localStorage tokens from old sessions
    localStorage.removeItem("santech_token");
    localStorage.removeItem("santech_user");

    if (storedToken && storedUser && loginTime) {
      const elapsed = Date.now() - parseInt(loginTime, 10);
      const remaining = SESSION_MS - elapsed;
      if (remaining <= 0) {
        // Already expired
        doLogout("expired");
      } else {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          startHardTimer(remaining);
        } catch {
          doLogout("expired");
        }
      }
    }
    setIsInitialized(true);

    return () => {
      if (hardTimerRef.current) clearTimeout(hardTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Inactivity auto-logout (also 10 min of no interaction) ─────────────────
  useEffect(() => {
    if (!token) return;

    let idleTimer: ReturnType<typeof setTimeout>;

    const handleActivity = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        performLogout("idle");
      }, SESSION_MS);
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    handleActivity(); // start idle timer immediately

    return () => {
      clearTimeout(idleTimer);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = (data: AuthResponse) => {
    const now = Date.now();
    sessionStorage.setItem("santech_token", data.token);
    sessionStorage.setItem("santech_user", JSON.stringify(data.user));
    sessionStorage.setItem("santech_login_time", String(now));
    setToken(data.token);
    setUser(data.user);
    startHardTimer(SESSION_MS);
  };

  const logout = () => {
    doLogout("idle");
    if (hardTimerRef.current) clearTimeout(hardTimerRef.current);
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
