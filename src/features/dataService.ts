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
import { fetchEngineHoursByTrip } from "@/features/utilization/statusDataPipeline";
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

  if (utilization.utilizationSource === "trip") {
    utilization = mergeIdlingFromExceptions(utilization, filteredExceptions, rulesFromNames);
  }

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

/** Parses Geotab TimeSpan string "d.hh:mm:ss.fffffff" or "hh:mm:ss" into total seconds. */
function parseTimeSpanString(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  const asNum = parseFloat(trimmed);
  if (!Number.isNaN(asNum)) return asNum;
  const dotIdx = trimmed.indexOf(".");
  let days = 0;
  let timeStr = trimmed;
  if (dotIdx > 0) {
    days = parseInt(trimmed.slice(0, dotIdx), 10) || 0;
    timeStr = trimmed.slice(dotIdx + 1);
  }
  const parts = timeStr.split(":");
  if (parts.length < 3) return days * 86400;
  const h = parseInt(parts[0] ?? "0", 10) || 0;
  const m = parseInt(parts[1] ?? "0", 10) || 0;
  const secFrac = parseFloat(parts[2] ?? "0") || 0;
  return days * 86400 + h * 3600 + m * 60 + secFrac;
}

function parseExceptionDuration(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number" && !Number.isNaN(d)) return d;
  if (typeof d === "object" && d !== null) {
    const o = d as Record<string, unknown>;
    const sec = (o.totalSeconds as number) ?? (o.TotalSeconds as number);
    if (typeof sec === "number") return sec;
    const ticks = o.ticks as number | undefined;
    if (typeof ticks === "number") return ticks / 10_000_000;
  }
  if (typeof d === "string" && d) {
    const parsed = parseTimeSpanString(d);
    if (parsed >= 0) return parsed;
  }
  return 0;
}

function getExceptionDurationSeconds(ex: ExceptionEventRecord): number {
  const dur = parseExceptionDuration(ex.duration);
  if (dur > 0) return dur;
  const from = ex.activeFrom ? new Date(ex.activeFrom).getTime() : NaN;
  const to = ex.activeTo ? new Date(ex.activeTo).getTime() : from;
  if (!Number.isNaN(from) && !Number.isNaN(to) && to >= from) {
    return (to - from) / 1000;
  }
  return 0;
}

const RULE_IDLING_ID = "RuleIdlingId";

/** Merge idling time from ExceptionEvents (idling rules) into utilization when using Trip API fallback. */
function mergeIdlingFromExceptions(
  utilization: UtilizationAggregates,
  exceptions: ExceptionEventRecord[],
  rules: Array<{ id: string; name: string }>
): UtilizationAggregates {
  const idlingRuleIds = new Set(
    rules
      .filter((r) => r.id === RULE_IDLING_ID || r.name.toLowerCase().includes("idle"))
      .map((r) => r.id)
  );
  idlingRuleIds.add(RULE_IDLING_ID);

  const idleSecondsByDevice = new Map<string, number>();
  for (const ex of exceptions) {
    if (!idlingRuleIds.has(ex.rule?.id ?? "")) continue;
    const deviceId = ex.device?.id ?? "unknown";
    const dur = getExceptionDurationSeconds(ex);
    idleSecondsByDevice.set(deviceId, (idleSecondsByDevice.get(deviceId) ?? 0) + dur);
  }
  if (idleSecondsByDevice.size === 0) return utilization;

  const byDevice = { ...utilization.byDevice };
  for (const [deviceId, sec] of idleSecondsByDevice) {
    if (byDevice[deviceId]) {
      byDevice[deviceId] = { ...byDevice[deviceId], idlingSeconds: sec };
    } else {
      byDevice[deviceId] = {
        distanceKm: 0,
        drivingSeconds: 0,
        idlingSeconds: sec,
        stopSeconds: 0,
        afterHoursDistanceKm: 0,
        tripCount: 0,
        speedProxySeconds: 0,
        daysUsed: 0,
      };
    }
  }
  const totalIdlingSeconds = Object.values(byDevice).reduce((sum, e) => sum + e.idlingSeconds, 0);

  if (import.meta.env.DEV) {
    const devicesWithIdle = [...idleSecondsByDevice.entries()].filter(([, s]) => s > 0);
    console.debug("[idling] rules:", [...idlingRuleIds], "exceptions:", exceptions.filter((e) => idlingRuleIds.has(e.rule?.id ?? "")).length, "devicesWithIdle:", devicesWithIdle.length, "totalIdlingSec:", totalIdlingSeconds);
    if (devicesWithIdle.length > 0) {
      const sample = devicesWithIdle[0];
      const sampleEx = exceptions.find((e) => idlingRuleIds.has(e.rule?.id ?? "") && (e.device?.id ?? "") === sample[0]);
      if (sampleEx) {
        console.debug("[idling] sample duration raw:", sampleEx.duration, "parsed:", getExceptionDurationSeconds(sampleEx));
      }
    }
  }

  return {
    ...utilization,
    totalIdlingSeconds,
    byDevice,
  };
}

/** When Trip.engineHours is missing for many trips, fetch StatusData engine hours and pass to aggregation. */
async function aggregateTripsWithEngineFallback(
  api: GeotabApiWrapper,
  trips: TripRecord[],
  onProgress?: (phase: string, current: number, total: number) => void
): Promise<UtilizationAggregates> {
  const withDistance = trips.filter((t) => (t.distance ?? 0) > 0);
  const missingEngine = withDistance.filter((t) => {
    const raw = t as unknown as Record<string, unknown>;
    const v = raw.engineHours ?? raw.EngineHours;
    return v == null || (typeof v === "number" && v <= 0);
  });
  const fraction = withDistance.length > 0 ? missingEngine.length / withDistance.length : 0;

  let engineDeltas: Map<string, number> | undefined;
  if (fraction > 0.3) {
    onProgress?.("engineHours", 0, 1);
    try {
      engineDeltas = await fetchEngineHoursByTrip(api, trips);
    } catch (e) {
      console.warn("StatusData engine hours fallback failed:", e);
    }
  }

  return aggregateTrips(trips, engineDeltas);
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
  const rulePatterns = ["%Speeding%", "%Harsh%", "%Harsh%Acceleration%", "%Harsh%Braking%", "%Harsh%Cornering%", "%Idle%"];
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
    ["Get", { typeName: "Rule", search: { id: "RuleIdlingId" } }],
  ];
  const batchResults = await api.multiCall<Array<{ id: string; name: string }> | Array<{ id: string; name: string }>>(batchCalls);
  const devicesRaw = batchResults[0];
  const deviceList = (Array.isArray(devicesRaw) ? devicesRaw : []) ?? [];
  const deviceMap = new Map(deviceList.map((d) => [d.id, d.name]));

  const rules: Array<{ id: string; name: string }> = [];
  const seenRules = new Set<string>();
  for (let i = 1; i < batchResults.length; i++) {
    const r = batchResults[i];
    const arr = Array.isArray(r) ? r : r ? [r] : [];
    for (const rule of arr) {
      if (rule?.id && !seenRules.has(rule.id)) {
        seenRules.add(rule.id);
        rules.push({ id: rule.id, name: rule.name ?? "Idling" });
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
      utilization = await aggregateTripsWithEngineFallback(api, trips, onProgress);
    }
  } else {
    const trips = await fetchTrips(api, from, to, (c, t) =>
      onProgress?.("trips", c, t)
    );
    utilization = await aggregateTripsWithEngineFallback(api, trips, onProgress);
  }

  let ruleIds = rules.map((r) => r.id);
  if (!ruleIds.includes("RuleIdlingId")) {
    ruleIds = [...ruleIds, "RuleIdlingId"];
  }
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

  if (utilization.utilizationSource === "trip") {
    utilization = mergeIdlingFromExceptions(utilization, exceptions, rules);
  }

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
