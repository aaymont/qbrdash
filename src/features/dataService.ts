/**
 * Data service: orchestrates pipelines, caching, and device resolution.
 */

import type { GeotabApiWrapper } from "@/lib/geotab";
import { getCached, getCachedEntry, setCached, clearCache, clearCacheForClient, type CacheKey } from "@/lib/cache/cacheHelpers";
import { fetchTrips, aggregateTrips, type UtilizationAggregates, type TripRecord } from "@/features/utilization/tripsPipeline";
import {
  fetchExceptionEvents,
  aggregateSafety,
  type SafetyAggregates,
  type ExceptionEventRecord,
} from "@/features/safety/safetyPipeline";
import {
  fetchFaultData,
  fetchRecentFaults,
  aggregateFaults,
  type FaultAggregates,
  type FaultDataRecord,
} from "@/features/maintenance/faultsPipeline";
import {
  fetchUtilizationFromDataConnector,
  aggregateFromDailyRows,
  type DataConnectorCredentials,
} from "@/features/utilization/dataConnectorPipeline";
export interface DateWindow {
  type: "preset" | "custom";
  days?: number;
  from?: Date;
  to?: Date;
}

export interface DataPayload {
  utilization: UtilizationAggregates;
  safety: SafetyAggregates;
  faults: FaultAggregates;
  devices: Array<{ id: string; name: string }>;
  /** Max calendar days in the selected window (7, 14, 30, 90, or custom span). Used to cap days used. */
  maxDaysInWindow?: number;
  /** Timestamp of the end of the fetched date range (e.g. end of yesterday). Used for slicing. */
  dataToMs?: number;
  cachedAt: number;
  expiresAt: number;
}

function toCacheKey(window: DateWindow, server: string, database: string): CacheKey {
  if (window.type === "preset" && window.days != null) {
    return { server, database, windowDays: window.days };
  }
  if (window.type === "custom" && window.from && window.to) {
    return {
      server,
      database,
      customFrom: window.from.toISOString(),
      customTo: window.to.toISOString(),
    };
  }
  return { server, database, windowDays: 7 };
}

/** Longer preset days, in ascending order, for cache fallback. */
const LONGER_PRESETS = [14, 30, 90];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Slices a cached payload to a shorter preset window.
 * Works with rawTrips (Trip API) or rawDailyRows (Data Connector).
 * Returns null if no raw data or requested days >= cached days.
 */
function slicePayloadToShorterWindow(
  payload: DataPayload,
  requestedDays: number
): DataPayload | null {
  const cachedDays = payload.maxDaysInWindow ?? 0;
  if (requestedDays >= cachedDays) return null;

  const cacheEndMs = payload.dataToMs ?? payload.cachedAt;

  const rawTrips = payload.utilization?.rawTrips ?? [];
  const rawDailyRows = payload.utilization?.rawDailyRows ?? [];
  const hasUtilizationData = rawTrips.length > 0 || rawDailyRows.length > 0;
  if (!hasUtilizationData) return null;

  let utilization: UtilizationAggregates;
  let speedProxy: number;

  const sliceStartMs = cacheEndMs - requestedDays * MS_PER_DAY;
  const sliceEndMs = cacheEndMs;
  const inRange = (ms: number) => ms >= sliceStartMs && ms <= sliceEndMs;

  if (rawTrips.length > 0) {
    const filteredTrips = rawTrips.filter((t) => {
      const ms = t.start ? new Date(t.start).getTime() : 0;
      return inRange(ms);
    }) as TripRecord[];
    utilization = aggregateTrips(filteredTrips);
  } else {
    const filteredRows = rawDailyRows.filter((row) => {
      const dateStr = row.Local_Date as string | undefined;
      if (!dateStr) return false;
      const dayStart = new Date(dateStr + "T00:00:00Z").getTime();
      const dayEnd = dayStart + MS_PER_DAY - 1;
      return dayEnd >= sliceStartMs && dayStart <= sliceEndMs;
    });
    utilization = aggregateFromDailyRows(filteredRows);
  }

  speedProxy =
    utilization.speedRange1DurationSeconds +
    utilization.speedRange2DurationSeconds +
    utilization.speedRange3DurationSeconds;

  const rawExceptions = (payload.safety?.rawExceptions ?? []) as ExceptionEventRecord[];
  const filteredExceptions = rawExceptions.filter((ex) => {
    const ms = ex.activeFrom ? new Date(ex.activeFrom).getTime() : 0;
    return inRange(ms);
  });

  const rulesFromNames = Object.entries(payload.safety.ruleNames ?? {}).map(([id, name]) => ({
    id,
    name,
  }));
  const safety = aggregateSafety(filteredExceptions, rulesFromNames, speedProxy);

  const rawFaults = (payload.faults?.rawFaults ?? []) as FaultDataRecord[];
  const filteredFaults = rawFaults.filter((f) => {
    const ms = f.dateTime ? new Date(f.dateTime).getTime() : 0;
    return inRange(ms);
  });
  const faults = aggregateFaults(filteredFaults, filteredFaults);

  return {
    utilization,
    safety,
    faults,
    devices: payload.devices,
    maxDaysInWindow: requestedDays,
    dataToMs: payload.dataToMs,
    cachedAt: payload.cachedAt,
    expiresAt: payload.expiresAt,
  };
}

/** Returns end of previous day (23:59:59.999) so we exclude current day data. */
function getEndOfYesterday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
}

function getDateRange(window: DateWindow): { from: Date; to: Date } {
  if (window.type === "custom" && window.from && window.to) {
    return { from: window.from, to: window.to };
  }
  const days = window.days ?? 7;
  const to = getEndOfYesterday();
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - days + 1, 0, 0, 0, 0);
  return { from, to };
}

export const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

export interface LoadDataOptions {
  credentials?: DataConnectorCredentials;
}

export async function loadData(
  api: GeotabApiWrapper,
  server: string,
  database: string,
  window: DateWindow,
  ttlMs = DEFAULT_TTL_MS,
  onProgress?: (phase: string, current: number, total: number) => void,
  options?: LoadDataOptions
): Promise<DataPayload> {
  const cacheKey = toCacheKey(window, server, database);
  const cached = await getCached<DataPayload>(cacheKey, "qbr_data", ttlMs);
  if (cached) {
    return cached;
  }

  const { from, to } = getDateRange(window);

  onProgress?.("devices", 0, 1);
  const rulePatterns = ["%Speeding%", "%Harsh%", "%Harsh%Acceleration%", "%Harsh%Braking%", "%Harsh%Cornering%"];
  const batchCalls: [string, Record<string, unknown>][] = [
    [
      "Get",
      {
        typeName: "Device",
        resultsLimit: 25000,
        propertySelector: { fields: ["id", "name"], isIncluded: true },
      },
    ],
    ...rulePatterns.map((name) => [
      "Get",
      {
        typeName: "Rule",
        search: { name },
        resultsLimit: 100,
      },
    ] as [string, Record<string, unknown>]),
  ];
  const batchResults = await api.multiCall<Array<{ id: string; name: string }> | Array<{ id: string; name: string }>>(batchCalls);
  const devicesRaw = batchResults[0];
  const deviceList = (Array.isArray(devicesRaw) ? devicesRaw : []) ?? [];
  const deviceMap = new Map(deviceList.map((d) => [d.id, d.name]));

  const rules: Array<{ id: string; name: string }> = [];
  const seenRules = new Set<string>();
  for (let i = 1; i < batchResults.length; i++) {
    const r = batchResults[i];
    if (Array.isArray(r)) {
      for (const rule of r) {
        if (rule?.id && !seenRules.has(rule.id)) {
          seenRules.add(rule.id);
          rules.push(rule);
        }
      }
    }
  }

  onProgress?.("trips", 0, 1);
  const creds = options?.credentials;
  const hasCreds = creds?.database && creds?.userName && creds?.password;

  let utilization: UtilizationAggregates;
  if (hasCreds) {
    try {
      utilization = await fetchUtilizationFromDataConnector(
        { database: creds.database, userName: creds.userName, password: creds.password, server: creds.server ?? server },
        window,
        (phase) => onProgress?.(phase, 0, 1)
      );
    } catch (err) {
      console.warn("Data Connector unavailable, using Trip API:", err);
      const trips = await fetchTrips(api, from, to, (c, t) =>
        onProgress?.("trips", c, t)
      );
      utilization = aggregateTrips(trips);
    }
  } else {
    const trips = await fetchTrips(api, from, to, (c, t) =>
      onProgress?.("trips", c, t)
    );
    utilization = aggregateTrips(trips);
  }

  const ruleIds = rules.map((r) => r.id);
  onProgress?.("safety", 0, ruleIds.length);
  const exceptions = await fetchExceptionEvents(
    api,
    ruleIds,
    from,
    to,
    (c, t) => onProgress?.("safety", c, t)
  );
  const safety = aggregateSafety(
    exceptions,
    rules,
    utilization.speedRange1DurationSeconds +
      utilization.speedRange2DurationSeconds +
      utilization.speedRange3DurationSeconds
  );

  onProgress?.("faults", 0, 1);
  const [faultsAll, recentFaults] = await Promise.all([
    fetchFaultData(api, from, to, () => onProgress?.("faults", 1, 1)),
    fetchRecentFaults(api, 7),
  ]);
  const faults = aggregateFaults(faultsAll, recentFaults);

  const maxDaysInWindow =
    window.type === "preset" && window.days != null
      ? window.days
      : Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  const now = Date.now();
  const payload: DataPayload = {
    utilization,
    safety,
    faults,
    devices: deviceList.length > 0 ? deviceList : Array.from(deviceMap.entries()).map(([id, name]) => ({ id, name })),
    maxDaysInWindow,
    dataToMs: to.getTime(),
    cachedAt: now,
    expiresAt: now + ttlMs,
  };

  await setCached(cacheKey, "qbr_data", payload as unknown as Record<string, unknown>, ttlMs);
  return payload;
}

/** Returns cached payload for display on load, even if expired. */
export async function getCachedDataForDisplay(
  server: string,
  database: string,
  window: DateWindow
): Promise<DataPayload | null> {
  const cacheKey = toCacheKey(window, server, database);
  const entry = await getCachedEntry<DataPayload>(cacheKey, "qbr_data");
  if (entry?.data) return entry.data;

  if (window.type === "preset" && window.days != null) {
    const requestedDays = window.days;
    for (const longerDays of LONGER_PRESETS) {
      if (longerDays <= requestedDays) continue;
      const longerKey: CacheKey = { server, database, windowDays: longerDays };
      const longerEntry = await getCachedEntry<DataPayload>(longerKey, "qbr_data");
      if (longerEntry?.data) {
        const sliced = slicePayloadToShorterWindow(longerEntry.data, requestedDays);
        if (sliced) return sliced;
      }
    }
  }

  return null;
}

export { clearCache, clearCacheForClient };
