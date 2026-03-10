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
  const entries = await db.cache.where("server").equals(server).toArray();
  const toDelete = entries.filter((e) => e.database === database).map((e) => e.id);
  await db.cache.bulkDelete(toDelete);
}
