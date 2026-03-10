/**
 * Session-only credential store for Geotab API.
 * Uses sessionStorage so credentials are cleared when the tab closes.
 * Never stores the password; only session token is persisted.
 */

const SESSION_KEY = "geotab_session";

export interface StoredCredentials {
  server: string;
  database: string;
  userName: string;
  password?: string;
  path?: string;
  sessionId?: string;
}

export interface CredentialStore {
  get: () => Promise<StoredCredentials | null>;
  set: (creds: StoredCredentials) => Promise<void>;
  remove: () => Promise<void>;
}

export function createSessionStore(): CredentialStore {
  return {
    async get(): Promise<StoredCredentials | null> {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredCredentials;
        if (!parsed.server || !parsed.database || !parsed.userName) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    async set(creds: StoredCredentials): Promise<void> {
      const toStore: StoredCredentials = {
        server: creds.server,
        database: creds.database,
        userName: creds.userName,
        path: creds.path,
        sessionId: creds.sessionId,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(toStore));
    },
    async remove(): Promise<void> {
      sessionStorage.removeItem(SESSION_KEY);
    },
  };
}
