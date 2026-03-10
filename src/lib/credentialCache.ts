/**
 * Credential cache in localStorage for known Geotab clients.
 * Keys by server+database so returning users don't have to re-enter.
 * Use with caution: stored in plaintext in the browser.
 */

const CACHE_KEY = "geotab_credential_cache";

function clientKey(server: string, database: string): string {
  return `${(server || "my.geotab.com").trim().toLowerCase()}|${(database || "").trim()}`;
}

interface CachedCreds {
  userName: string;
  password: string;
}

function loadCache(): Record<string, CachedCreds> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CachedCreds>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function getCachedCredentials(server: string, database: string): CachedCreds | null {
  const cache = loadCache();
  const key = clientKey(server, database);
  const cached = cache[key];
  return cached?.userName ? cached : null;
}

export function setCachedCredentials(
  server: string,
  database: string,
  userName: string,
  password: string
): void {
  const cache = loadCache();
  cache[clientKey(server, database)] = { userName, password };
  saveCache(cache);
}

export function clearCachedCredentials(server: string, database: string): void {
  const cache = loadCache();
  delete cache[clientKey(server, database)];
  saveCache(cache);
}
