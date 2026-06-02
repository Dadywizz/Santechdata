import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { User, AuthResponse } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("santech_token");
    const storedUser = localStorage.getItem("santech_user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem("santech_token");
        localStorage.removeItem("santech_user");
      }
    }
  }, []);

  const login = (data: AuthResponse) => {
    localStorage.setItem("santech_token", data.token);
    localStorage.setItem("santech_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("santech_token");
    localStorage.removeItem("santech_user");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem("santech_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
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
