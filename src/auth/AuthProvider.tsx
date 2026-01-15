import React, {createContext, useContext, useEffect, useMemo, useState} from "react";
import {api} from "../lib/api";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; username: string }
  | { status: "anonymous" };

type AuthContextValue = {
  state: AuthState;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({status: "loading"});

  const refresh = async () => {
    try {
      const me = await api.me();
      if (me.authenticated && me.username) {
        setState({status: "authenticated", username: me.username});
      } else {
        setState({status: "anonymous"});
      }
    } catch {
      setState({status: "anonymous"});
    }
  };

  const login = async (username: string, password: string) => {
    await api.login(username, password);
    await refresh();
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      await refresh();
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({state, refresh, login, logout}),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
