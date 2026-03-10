/**
 * Geotab API wrapper using mg-api-js.
 * - rememberMe: true with sessionStorage (cleared when tab closes)
 * - Exponential backoff on 429/transient failures
 */

import GeotabApi from "mg-api-js";
import { createSessionStore } from "./sessionStore";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(base: number): number {
  return base + Math.random() * base * 0.5;
}

export interface GeotabCredentials {
  server: string;
  database: string;
  userName: string;
  password: string;
}

export interface GeotabApiWrapper {
  call<T>(method: string, params: Record<string, unknown>): Promise<T>;
  multiCall<T = unknown>(calls: [string, Record<string, unknown>][]): Promise<T[]>;
  authenticate(): Promise<unknown>;
  forget(): Promise<unknown>;
  getSession(): Promise<{ credentials: Record<string, unknown>; path: string }>;
}

export function createGeotabApi(credentials: GeotabCredentials): GeotabApiWrapper {
  const sessionStore = createSessionStore();

  const authentication = {
    credentials: {
      database: credentials.database,
      userName: credentials.userName,
      password: credentials.password,
    },
    path: credentials.server || "my.geotab.com",
  };

  const api = new GeotabApi(authentication, {
    rememberMe: true,
    timeout: 30,
    newCredentialStore: sessionStore,
  });

  const callWithRetry = async <T>(
    method: string,
    params: Record<string, unknown>
  ): Promise<T> => {
    let lastError: unknown;
    let backoff = INITIAL_BACKOFF_MS;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return (await api.call(method, params)) as T;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const is429 =
          msg.includes("429") ||
          msg.toLowerCase().includes("rate") ||
          msg.toLowerCase().includes("limit");
        const isTransient =
          msg.toLowerCase().includes("timeout") ||
          msg.toLowerCase().includes("network") ||
          msg.includes("500") ||
          msg.includes("503");

        if (attempt < MAX_RETRIES && (is429 || isTransient)) {
          const delay = jitter(backoff);
          await sleep(delay);
          backoff *= 2;
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  };

  return {
    async call<T>(method: string, params: Record<string, unknown>): Promise<T> {
      return callWithRetry<T>(method, params);
    },

    async multiCall<T = unknown>(
      calls: [string, Record<string, unknown>][]
    ): Promise<T[]> {
      let lastError: unknown;
      let backoff = INITIAL_BACKOFF_MS;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          return (await api.multiCall(calls)) as T[];
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          const is429 =
            msg.includes("429") || msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit");
          const isTransient =
            msg.toLowerCase().includes("timeout") ||
            msg.toLowerCase().includes("network") ||
            msg.includes("500") ||
            msg.includes("503");
          if (attempt < MAX_RETRIES && (is429 || isTransient)) {
            await sleep(jitter(backoff));
            backoff *= 2;
          } else {
            throw err;
          }
        }
      }
      throw lastError;
    },

    authenticate() {
      return api.authenticate();
    },

    forget() {
      return api.forget();
    },

    getSession() {
      return api.getSession();
    },
  };
}
