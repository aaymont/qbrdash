/**
 * StatusData pipeline for engine hours fallback when Trip.engineHours is missing.
 * Uses DiagnosticEngineHoursId; values are in seconds.
 */

import type { GeotabApiWrapper } from "@/lib/geotab";
import type { TripRecord } from "./tripsPipeline";

interface StatusDataRecord {
  id?: string;
  dateTime: string;
  data: number;
  device?: { id: string };
}

const RESULTS_LIMIT = 50000;

/**
 * Fetches engine hours from StatusData per device and computes per-trip deltas.
 * Returns map of trip id -> engine delta seconds. Only includes trips with valid delta.
 */
export async function fetchEngineHoursByTrip(
  api: GeotabApiWrapper,
  trips: TripRecord[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (trips.length === 0) return result;

  const deviceIds = [...new Set(trips.map((t) => t.device?.id).filter(Boolean))] as string[];
  if (deviceIds.length === 0) return result;

  const minStart = trips.reduce(
    (min, t) => Math.min(min, new Date(t.start).getTime()),
    Infinity
  );
  const maxStop = trips.reduce(
    (max, t) => Math.max(max, new Date(t.stop).getTime()),
    -Infinity
  );
  const fromDate = new Date(minStart - 60000).toISOString();
  const toDate = new Date(maxStop + 60000).toISOString();

  const readingsByDevice = new Map<string, StatusDataRecord[]>();

  for (const deviceId of deviceIds) {
    const rows = (await api.call("Get", {
      typeName: "StatusData",
      search: {
        deviceSearch: { id: deviceId },
        diagnosticSearch: { id: "DiagnosticEngineHoursId" },
        fromDate,
        toDate,
      },
      resultsLimit: RESULTS_LIMIT,
    })) as StatusDataRecord[];

    if (rows?.length > 0) {
      const sorted = [...rows].sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      );
      readingsByDevice.set(deviceId, sorted);
    }
  }

  for (const t of trips) {
    const deviceId = t.device?.id;
    if (!deviceId) continue;

    const readings = readingsByDevice.get(deviceId);
    if (!readings || readings.length < 2) continue;

    const startMs = new Date(t.start).getTime();
    const stopMs = new Date(t.stop).getTime();

    // Engine hours at start: last reading at or before trip start
    let firstIdx = -1;
    for (let i = readings.length - 1; i >= 0; i--) {
      if (new Date(readings[i].dateTime).getTime() <= startMs) {
        firstIdx = i;
        break;
      }
    }
    if (firstIdx < 0) firstIdx = 0;

    // Engine hours at stop: first reading at or after trip stop
    let lastIdx = -1;
    for (let i = 0; i < readings.length; i++) {
      if (new Date(readings[i].dateTime).getTime() >= stopMs) {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx < 0) lastIdx = readings.length - 1;

    if (firstIdx >= lastIdx) continue;

    const firstData = readings[firstIdx]?.data;
    const lastData = readings[lastIdx]?.data;
    if (typeof firstData !== "number" || typeof lastData !== "number") continue;

    const delta = lastData - firstData;
    if (delta >= 0 && delta < 86400 * 2) {
      result.set(t.id, delta);
    }
  }

  return result;
}
