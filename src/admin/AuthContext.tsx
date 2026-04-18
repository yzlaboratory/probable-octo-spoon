import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, setCsrfToken } from "./api";
import type { Admin } from "./types";

interface AuthState {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const me = await api.get<{ admin: Admin; csrfToken: string }>("/api/auth/me");
      setCsrfToken(me.csrfToken);
      setAdmin(me.admin);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setCsrfToken(null);
        setAdmin(null);
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ admin: Admin; csrfToken: string }>("/api/auth/login", {
      email,
      password,
    });
    setCsrfToken(res.csrfToken);
    setAdmin(res.admin);
  }

  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setCsrfToken(null);
      setAdmin(null);
    }
  }

  const value = useMemo(() => ({ admin, loading, login, logout, refresh }), [admin, loading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
