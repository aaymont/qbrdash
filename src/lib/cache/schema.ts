import Dexie, { type EntityTable } from "dexie";

export const APP_VERSION = "1.0.0";

export interface CacheEntry {
  id: string;
  server: string;
  database: string;
  windowKey: string;
  appVersion: string;
  data: Record<string, unknown>;
  cachedAt: number;
  expiresAt: number;
}

export class QbrCacheDB extends Dexie {
  cache!: EntityTable<CacheEntry, "id">;

  constructor() {
    super("QbrInsightsCache");
    this.version(1).stores({
      cache: "id, [server+database+windowKey], expiresAt, cachedAt",
    });
  }
}

export const db = new QbrCacheDB();
