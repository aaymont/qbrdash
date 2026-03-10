import React, { createContext, useContext, useState, useCallback } from "react";
import { createGeotabApi } from "@/lib/geotab";
import type { GeotabApiWrapper, GeotabCredentials } from "@/lib/geotab";
import type { ClientEntry } from "@/lib/clientRegistry";

interface AuthState {
  api: GeotabApiWrapper | null;
  client: ClientEntry | null;
  credentials: GeotabCredentials | null;
  isAuthenticated: boolean;
  error: string | null;
}

export interface LoginCredentials {
  server: string;
  database: string;
  userName: string;
  password: string;
}

interface AuthContextValue extends AuthState {
  login: (creds: LoginCredentials, client?: ClientEntry) => Promise<void>;
  logout: () => Promise<void>;
  forgetSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    api: null,
    client: null,
    credentials: null,
    isAuthenticated: false,
    error: null,
  });

  const login = useCallback(
    async (creds: LoginCredentials, client?: ClientEntry) => {
      setState((s) => ({ ...s, error: null }));
      const geotabCreds: GeotabCredentials = {
        server: creds.server,
        database: creds.database,
        userName: creds.userName,
        password: creds.password,
      };
      try {
        const api = createGeotabApi(geotabCreds);
        await api.authenticate();
        const resolvedClient: ClientEntry =
          client ??
          ({
            id: `temp_${Date.now()}`,
            server: creds.server,
            database: creds.database,
            friendlyName: creds.database,
            createdAt: new Date().toISOString(),
          } as ClientEntry);
        setState({
          api,
          client: resolvedClient,
          credentials: geotabCreds,
          isAuthenticated: true,
          error: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setState((s) => ({
          ...s,
          api: null,
          client: null,
          credentials: null,
          isAuthenticated: false,
          error: msg,
        }));
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    if (state.api) {
      try {
        await state.api.forget();
      } catch {
        // ignore
      }
    }
    setState({
      api: null,
      client: null,
      credentials: null,
      isAuthenticated: false,
      error: null,
    });
  }, [state.api]);

  const forgetSession = useCallback(async () => {
    if (state.api) {
      try {
        await state.api.forget();
      } catch {
        // ignore
      }
    }
    setState((s) => ({
      ...s,
      api: null,
      credentials: null,
      isAuthenticated: false,
    }));
  }, [state.api]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    forgetSession,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
