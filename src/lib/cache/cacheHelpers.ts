import { db, type CacheEntry, APP_VERSION } from "./schema";

export const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface CacheKey {
  server: string;
  database: string;
  windowDays?: number;
  customFrom?: string;
  customTo?: string;
}

function windowKey(k: CacheKey): string {
  if (k.windowDays != null) return `days_${k.windowDays}`;
  if (k.customFrom && k.customTo) return `custom_${k.customFrom}_${k.customTo}`;
  return "unknown";
}

function entryId(k: CacheKey, dataType: string): string {
  const w = windowKey(k);
  return `${k.server}|${k.database}|${w}|${dataType}`;
}

export async function getCached<T>(
  key: CacheKey,
  dataType: string,
  _ttlMs = DEFAULT_TTL_MS
): Promise<T | null> {
  const id = entryId(key, dataType);
  const entry = await db.cache.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    await db.cache.delete(id);
    return null;
  }
  return entry.data as T;
}

/** Returns cached data regardless of expiry. Used to display cached data on load. */
export async function getCachedEntry<T>(
  key: CacheKey,
  dataType: string
): Promise<{ data: T; cachedAt: number } | null> {
  const id = entryId(key, dataType);
  const entry = await db.cache.get(id);
  if (!entry || !entry.data) return null;
  return { data: entry.data as T, cachedAt: entry.cachedAt };
}

export async function setCached(
  key: CacheKey,
  dataType: string,
  data: Record<string, unknown>,
  ttlMs = DEFAULT_TTL_MS
): Promise<void> {
  const now = Date.now();
  const entry: CacheEntry = {
    id: entryId(key, dataType),
    server: key.server,
    database: key.database,
    windowKey: windowKey(key),
    appVersion: APP_VERSION,
    data,
    cachedAt: now,
    expiresAt: now + ttlMs,
  };
  await db.cache.put(entry);
}

export async function clearCache(): Promise<void> {
  await db.cache.clear();
}

export async function clearCacheForClient(server: string, database: string): Promise<void> {
  const all = await db.cache.toArray();
  const toDelete = all
    .filter((e) => e.server === server && e.database === database)
    .map((e) => e.id);
  await db.cache.bulkDelete(toDelete);
}

export interface CachedClientSummary {
  server: string;
  database: string;
  friendlyName: string;
  entryCount: number;
  totalSizeBytes: number;
  cachedAt: number;
  expiresAt: number;
  status: "fresh" | "expired";
}

/** Returns all clients that have cached data, with aggregate stats. */
export async function listCachedClients(
  getFriendlyName: (server: string, database: string) => string
): Promise<CachedClientSummary[]> {
  const entries = await db.cache.toArray();
  const byClient = new Map<string, CacheEntry[]>();
  for (const e of entries) {
    const key = `${e.server}|${e.database}`;
    const list = byClient.get(key) ?? [];
    list.push(e);
    byClient.set(key, list);
  }
  const now = Date.now();
  const result: CachedClientSummary[] = [];
  for (const [key, list] of byClient) {
    const [server, database] = key.split("|");
    const totalSizeBytes = list.reduce((sum, e) => sum + JSON.stringify(e.data ?? {}).length, 0);
    const latest = list.reduce((a, b) => (a.cachedAt > b.cachedAt ? a : b));
    const earliestExpiry = list.reduce((a, b) => (a.expiresAt < b.expiresAt ? a : b));
    const status = earliestExpiry.expiresAt > now ? "fresh" : "expired";
    result.push({
      server,
      database,
      friendlyName: getFriendlyName(server, database),
      entryCount: list.length,
      totalSizeBytes,
      cachedAt: latest.cachedAt,
      expiresAt: earliestExpiry.expiresAt,
      status,
    });
  }
  return result.sort((a, b) => b.cachedAt - a.cachedAt);
}
