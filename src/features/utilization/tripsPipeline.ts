/**
 * Trips data pipeline for Utilization & Optimization.
 * Pulls Trip records and aggregates distance, driving, idling, stop, after-hours, speed ranges.
 */

import type { GeotabApiWrapper } from "@/lib/geotab";

const TRIP_PROPERTIES = [
  "id",
  "device",
  "driver",
  "start",
  "stop",
  "distance",
  "drivingDuration",
  "idlingDuration",
  "stopDuration",
  "workDistance",
  "workDrivingDuration",
  "workStopDuration",
  "afterHoursDistance",
  "afterHoursDrivingDuration",
  "afterHoursStopDuration",
  "speedRange1",
  "speedRange1Duration",
  "speedRange2",
  "speedRange2Duration",
  "speedRange3",
  "speedRange3Duration",
  "averageSpeed",
  "maximumSpeed",
  "engineHours",
] as const;

export interface TripRecord {
  id: string;
  device: { id: string };
  driver?: { id: string };
  start: string;
  stop: string;
  distance?: number;
  drivingDuration?: number;
  idlingDuration?: number;
  stopDuration?: number;
  workDistance?: number;
  workDrivingDuration?: number;
  workStopDuration?: number;
  afterHoursDistance?: number;
  afterHoursDrivingDuration?: number;
  afterHoursStopDuration?: number;
  speedRange1?: number;
  speedRange1Duration?: number;
  speedRange2?: number;
  speedRange2Duration?: number;
  speedRange3?: number;
  speedRange3Duration?: number;
  averageSpeed?: number;
  maximumSpeed?: number;
  engineHours?: number;
}

/** Parses Geotab duration: number, { totalSeconds/TotalSeconds }, or TimeSpan string "d.hh:mm:ss.fffffff". */
function parseDuration(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number" && !Number.isNaN(d)) return d;
  if (typeof d === "object" && d !== null) {
    const o = d as Record<string, unknown>;
    const sec =
      (o.totalSeconds as number | undefined) ?? (o.TotalSeconds as number | undefined);
    if (typeof sec === "number" && !Number.isNaN(sec)) return sec;
    const ticks = o.ticks as number | undefined;
    if (typeof ticks === "number" && !Number.isNaN(ticks)) return ticks / 10_000_000; // .NET ticks to seconds
  }
  if (typeof d === "string" && d) {
    const parsed = parseTimeSpanString(d);
    if (parsed >= 0) return parsed;
  }
  return 0;
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

export interface UtilizationAggregates {
  totalDistanceKm: number;
  totalDrivingSeconds: number;
  totalIdlingSeconds: number;
  totalStopSeconds: number;
  totalAfterHoursDistanceKm: number;
  totalAfterHoursDrivingSeconds: number;
  totalAfterHoursStopSeconds: number;
  tripCount: number;
  speedRange1Count: number;
  speedRange1DurationSeconds: number;
  speedRange2Count: number;
  speedRange2DurationSeconds: number;
  speedRange3Count: number;
  speedRange3DurationSeconds: number;
  byDevice: Record<
    string,
    {
      distanceKm: number;
      drivingSeconds: number;
      idlingSeconds: number;
      stopSeconds: number;
      afterHoursDistanceKm: number;
      tripCount: number;
      speedProxySeconds: number;
      daysUsed: number;
    }
  >;
  rawTrips: TripRecord[];
}

function parseEngineHours(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return !Number.isNaN(n) && n >= 0 ? n : 0;
}

export function aggregateTrips(trips: TripRecord[]): UtilizationAggregates {
  const byDevice: UtilizationAggregates["byDevice"] = {};
  const sorted = [...trips].sort((a, b) => {
    const devA = a.device?.id ?? "";
    const devB = b.device?.id ?? "";
    if (devA !== devB) return devA.localeCompare(devB);
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
  const prevEngineHoursByDevice = new Map<string, number>();
  const daysUsedByDevice = new Map<string, Set<number>>();

  let totalDistanceKm = 0;
  let totalDrivingSeconds = 0;
  let totalIdlingSeconds = 0;
  let totalStopSeconds = 0;
  let totalAfterHoursDistanceKm = 0;
  let totalAfterHoursDrivingSeconds = 0;
  let totalAfterHoursStopSeconds = 0;
  let speedRange1Count = 0;
  let speedRange1DurationSeconds = 0;
  let speedRange2Count = 0;
  let speedRange2DurationSeconds = 0;
  let speedRange3Count = 0;
  let speedRange3DurationSeconds = 0;

  for (const t of sorted) {
    const deviceId = t.device?.id ?? "unknown";
    const dist = t.distance ?? 0;
    const raw = t as unknown as Record<string, unknown>;
    // Geotab defines Driving as "excluding idle" (Data Connector DriveDuration_Seconds).
    // Trip.DrivingDuration = "between start and stop" (wall clock) — can include in-trip idle.
    // When we have EngineHours: engine = driving + idle. Use driving = engine − idle.
    let driving = parseDuration(raw.drivingDuration ?? raw.DrivingDuration);
    let idling = parseDuration(raw.idlingDuration ?? raw.IdlingDuration);
    const engineSeconds = parseEngineHours(raw.engineHours ?? raw.EngineHours);
    const prevEngineSec = prevEngineHoursByDevice.get(deviceId);
    if (prevEngineSec != null && engineSeconds > prevEngineSec) {
      const engineDeltaSeconds = engineSeconds - prevEngineSec;
      if (idling <= 0) {
        const derivedIdle = Math.max(0, engineDeltaSeconds - driving);
        idling = Math.min(derivedIdle, driving * 10, 86400);
      }
      driving = Math.max(0, Math.min(engineDeltaSeconds - idling, engineDeltaSeconds));
    }
    if (engineSeconds > 0) prevEngineHoursByDevice.set(deviceId, engineSeconds);
    if (driving <= 0 && t.start && t.stop) {
      const startMs = new Date(t.start).getTime();
      const stopMs = new Date(t.stop).getTime();
      if (!Number.isNaN(startMs) && !Number.isNaN(stopMs) && stopMs > startMs) {
        driving = (stopMs - startMs) / 1000; // fallback when no engine data
      }
    }
    const stop = parseDuration(raw.stopDuration ?? raw.StopDuration);
    const ahDist = t.afterHoursDistance ?? 0;
    const ahDriving = parseDuration(raw.afterHoursDrivingDuration ?? raw.AfterHoursDrivingDuration);
    const ahStop = parseDuration(raw.afterHoursStopDuration ?? raw.AfterHoursStopDuration);
    const sr1 = t.speedRange1 ?? 0;
    const sr1Dur = parseDuration(raw.speedRange1Duration ?? raw.SpeedRange1Duration);
    const sr2 = t.speedRange2 ?? 0;
    const sr2Dur = parseDuration(raw.speedRange2Duration ?? raw.SpeedRange2Duration);
    const sr3 = t.speedRange3 ?? 0;
    const sr3Dur = parseDuration(raw.speedRange3Duration ?? raw.SpeedRange3Duration);
    const speedProxySeconds = sr1Dur + sr2Dur + sr3Dur;

    totalDistanceKm += dist;
    totalDrivingSeconds += driving;
    totalIdlingSeconds += idling;
    totalStopSeconds += stop;
    totalAfterHoursDistanceKm += ahDist;
    totalAfterHoursDrivingSeconds += ahDriving;
    totalAfterHoursStopSeconds += ahStop;
    speedRange1Count += sr1;
    speedRange1DurationSeconds += sr1Dur;
    speedRange2Count += sr2;
    speedRange2DurationSeconds += sr2Dur;
    speedRange3Count += sr3;
    speedRange3DurationSeconds += sr3Dur;

    const dayKey = t.start ? Math.floor(new Date(t.start).getTime() / 86400000) : 0;
    if (!daysUsedByDevice.has(deviceId)) daysUsedByDevice.set(deviceId, new Set());
    daysUsedByDevice.get(deviceId)!.add(dayKey);

    if (!byDevice[deviceId]) {
      byDevice[deviceId] = {
        distanceKm: 0,
        drivingSeconds: 0,
        idlingSeconds: 0,
        stopSeconds: 0,
        afterHoursDistanceKm: 0,
        tripCount: 0,
        speedProxySeconds: 0,
        daysUsed: 0,
      };
    }
    byDevice[deviceId].distanceKm += dist;
    byDevice[deviceId].drivingSeconds += driving;
    byDevice[deviceId].idlingSeconds += idling;
    byDevice[deviceId].stopSeconds += stop;
    byDevice[deviceId].afterHoursDistanceKm += ahDist;
    byDevice[deviceId].tripCount += 1;
    byDevice[deviceId].speedProxySeconds += speedProxySeconds;
  }

  for (const [deviceId, days] of daysUsedByDevice) {
    if (byDevice[deviceId]) byDevice[deviceId].daysUsed = days.size;
  }

  return {
    totalDistanceKm,
    totalDrivingSeconds,
    totalIdlingSeconds,
    totalStopSeconds,
    totalAfterHoursDistanceKm,
    totalAfterHoursDrivingSeconds,
    totalAfterHoursStopSeconds,
    tripCount: trips.length,
    speedRange1Count,
    speedRange1DurationSeconds,
    speedRange2Count,
    speedRange2DurationSeconds,
    speedRange3Count,
    speedRange3DurationSeconds,
    byDevice,
    rawTrips: trips,
  };
}

const RESULTS_LIMIT = 25000;

async function fetchTripsChunk(
  api: GeotabApiWrapper,
  chunkFrom: string,
  chunkTo: string,
  searchFrom?: string
): Promise<TripRecord[]> {
  const result = (await api.call("Get", {
    typeName: "Trip",
    search: {
      fromDate: searchFrom ?? chunkFrom,
      toDate: chunkTo,
    },
    resultsLimit: RESULTS_LIMIT,
    propertySelector: {
      fields: [...TRIP_PROPERTIES],
      isIncluded: true,
    },
  })) as TripRecord[];

  return result && Array.isArray(result) ? result : [];
}

export async function fetchTrips(
  api: GeotabApiWrapper,
  fromDate: Date,
  toDate: Date,
  onProgress?: (chunk: number, total: number) => void
): Promise<TripRecord[]> {
  const all: TripRecord[] = [];
  const daysTotal = (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000);
  const chunkSize = daysTotal <= 14 ? 1 : 7;
  const chunkMs = chunkSize * 24 * 60 * 60 * 1000;
  let start = fromDate.getTime();
  let chunkIndex = 0;
  const totalChunks = Math.ceil(daysTotal / chunkSize);

  while (start < toDate.getTime()) {
    const chunkEnd = Math.min(start + chunkMs, toDate.getTime());
    const chunkFrom = new Date(start).toISOString();
    const chunkTo = new Date(chunkEnd).toISOString();

    let searchFrom = chunkFrom;
    while (true) {
      const result = await fetchTripsChunk(api, chunkFrom, chunkTo, searchFrom);
      if (result.length > 0) all.push(...result);
      if (result.length < RESULTS_LIMIT) break;
      const last = result[result.length - 1];
      const lastStop = last?.stop;
      if (!lastStop) break;
      searchFrom = new Date(new Date(lastStop).getTime() + 1).toISOString();
    }

    onProgress?.(chunkIndex + 1, totalChunks);
    chunkIndex++;
    start = chunkEnd;
  }

  return all;
}
