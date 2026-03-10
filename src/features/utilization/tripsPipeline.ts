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
}

function parseDuration(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  if (typeof d === "object" && d !== null && "totalSeconds" in d) {
    return (d as { totalSeconds?: number }).totalSeconds ?? 0;
  }
  return 0;
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
    }
  >;
  rawTrips: TripRecord[];
}

export function aggregateTrips(trips: TripRecord[]): UtilizationAggregates {
  const byDevice: UtilizationAggregates["byDevice"] = {};

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

  for (const t of trips) {
    const deviceId = t.device?.id ?? "unknown";
    const dist = t.distance ?? 0;
    const driving = parseDuration(t.drivingDuration);
    const idling = parseDuration(t.idlingDuration);
    const stop = parseDuration(t.stopDuration);
    const ahDist = t.afterHoursDistance ?? 0;
    const ahDriving = parseDuration(t.afterHoursDrivingDuration);
    const ahStop = parseDuration(t.afterHoursStopDuration);
    const sr1 = t.speedRange1 ?? 0;
    const sr1Dur = parseDuration(t.speedRange1Duration);
    const sr2 = t.speedRange2 ?? 0;
    const sr2Dur = parseDuration(t.speedRange2Duration);
    const sr3 = t.speedRange3 ?? 0;
    const sr3Dur = parseDuration(t.speedRange3Duration);
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

    if (!byDevice[deviceId]) {
      byDevice[deviceId] = {
        distanceKm: 0,
        drivingSeconds: 0,
        idlingSeconds: 0,
        stopSeconds: 0,
        afterHoursDistanceKm: 0,
        tripCount: 0,
        speedProxySeconds: 0,
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
