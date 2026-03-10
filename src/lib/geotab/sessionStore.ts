/**
 * Session-only credential store for Geotab API (mg-api-js contract).
 * Uses sessionStorage so credentials are cleared when the tab closes.
 * Never stores the password; only session token (sessionId) is persisted.
 */

const CREDENTIALS_KEY = "geotab_session_credentials";
const SERVER_KEY = "geotab_session_server";

export interface CredentialStore {
  get: () => { credentials: Record<string, unknown>; server: string } | false;
  set: (credentials: Record<string, unknown>, server: string) => void;
  clear: () => void;
}

export function createSessionStore(): CredentialStore {
  return {
    get() {
      try {
        const creds = sessionStorage.getItem(CREDENTIALS_KEY);
        const server = sessionStorage.getItem(SERVER_KEY) || "my.geotab.com";
        if (!creds) return false;
        const parsed = JSON.parse(creds) as Record<string, unknown>;
        if (!parsed.database || !parsed.userName) return false;
        return { credentials: parsed, server };
      } catch {
        return false;
      }
    },
    set(credentials: Record<string, unknown>, server: string) {
      const toStore: Record<string, unknown> = {
        database: credentials.database,
        userName: credentials.userName,
        sessionId: credentials.sessionId,
      };
      sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(toStore));
      sessionStorage.setItem(SERVER_KEY, server);
    },
    clear() {
      sessionStorage.removeItem(CREDENTIALS_KEY);
      sessionStorage.removeItem(SERVER_KEY);
    },
  };
}
