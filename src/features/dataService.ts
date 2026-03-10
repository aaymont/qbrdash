/**
 * Data service: orchestrates pipelines, caching, and device resolution.
 */

import type { GeotabApiWrapper } from "@/lib/geotab";
import { getCached, setCached, clearCache, clearCacheForClient, type CacheKey } from "@/lib/cache/cacheHelpers";
import { fetchTrips, aggregateTrips, type UtilizationAggregates } from "@/features/utilization/tripsPipeline";
import {
  fetchRules,
  fetchExceptionEvents,
  aggregateSafety,
  type SafetyAggregates,
} from "@/features/safety/safetyPipeline";
import {
  fetchFaultData,
  fetchRecentFaults,
  aggregateFaults,
  type FaultAggregates,
} from "@/features/maintenance/faultsPipeline";
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

function getDateRange(window: DateWindow): { from: Date; to: Date } {
  const to = new Date();
  if (window.type === "custom" && window.from && window.to) {
    return { from: window.from, to: window.to };
  }
  const days = window.days ?? 7;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

export async function loadData(
  api: GeotabApiWrapper,
  server: string,
  database: string,
  window: DateWindow,
  ttlMs = DEFAULT_TTL_MS,
  onProgress?: (phase: string, current: number, total: number) => void
): Promise<DataPayload> {
  const cacheKey = toCacheKey(window, server, database);
  const cached = await getCached<DataPayload>(cacheKey, "qbr_data", ttlMs);
  if (cached) {
    return cached;
  }

  const { from, to } = getDateRange(window);

  onProgress?.("devices", 0, 1);
  const devicesRaw = (await api.call("Get", {
    typeName: "Device",
    resultsLimit: 10000,
    propertySelector: { fields: ["id", "name"], isIncluded: true },
  })) as Array<{ id: string; name: string }>;
  const deviceList = devicesRaw ?? [];
  const deviceMap = new Map(deviceList.map((d) => [d.id, d.name]));

  onProgress?.("trips", 0, 1);
  const trips = await fetchTrips(api, from, to, (c, t) =>
    onProgress?.("trips", c, t)
  );
  const utilization = aggregateTrips(trips);

  const rules = await fetchRules(api);
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

  const now = Date.now();
  const payload: DataPayload = {
    utilization,
    safety,
    faults,
    devices: deviceList.length > 0 ? deviceList : Array.from(deviceMap.entries()).map(([id, name]) => ({ id, name })),
    cachedAt: now,
    expiresAt: now + ttlMs,
  };

  await setCached(cacheKey, "qbr_data", payload as unknown as Record<string, unknown>, ttlMs);
  return payload;
}

export { clearCache, clearCacheForClient };
