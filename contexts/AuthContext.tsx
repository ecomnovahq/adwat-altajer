"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, api } from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  tools_access: string[];
  plan: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = auth.getUser();
    if (stored) setUser(stored as unknown as User);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    setUser(data.user as unknown as User);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await api.register(name, email, password);
      setUser(data.user as unknown as User);
    },
    []
  );

  const logout = useCallback(() => {
    auth.clear();
    setUser(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAdmin: user?.is_admin ?? false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
