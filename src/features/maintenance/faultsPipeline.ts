/**
 * Maintenance data pipeline: FaultData.
 */

import type { GeotabApiWrapper } from "@/lib/geotab";

export interface FaultDataRecord {
  id: string;
  device: { id: string };
  diagnostic?: { id: string };
  dateTime: string;
  count?: number;
  faultDescription?: string;
  severity?: number;
  faultState?: { id: string };
  controller?: { id: string };
}

export interface FaultAggregates {
  totalFaults: number;
  byDevice: Record<
    string,
    {
      count: number;
      recentCount: number;
      bySeverity: Record<number, number>;
      topFaults: { description: string; count: number }[];
    }
  >;
  recentFaults: FaultDataRecord[];
  rawFaults: FaultDataRecord[];
}

const FAULT_RESULTS_LIMIT = 25000;

async function fetchFaultDataPage(
  api: GeotabApiWrapper,
  fromStr: string,
  toStr: string
): Promise<FaultDataRecord[]> {
  const result = (await api.call("Get", {
    typeName: "FaultData",
    search: {
      fromDate: fromStr,
      toDate: toStr,
    },
    resultsLimit: FAULT_RESULTS_LIMIT,
  })) as FaultDataRecord[];

  return result && Array.isArray(result) ? result : [];
}

export async function fetchFaultData(
  api: GeotabApiWrapper,
  fromDate: Date,
  toDate: Date,
  onProgress?: (done: boolean) => void
): Promise<FaultDataRecord[]> {
  const all: FaultDataRecord[] = [];
  const daysTotal = (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000);
  const chunkDays = daysTotal <= 14 ? 1 : 7;
  const chunkMs = chunkDays * 24 * 60 * 60 * 1000;
  let start = fromDate.getTime();

  while (start < toDate.getTime()) {
    const chunkEnd = Math.min(start + chunkMs, toDate.getTime());
    let searchFrom = new Date(start).toISOString();
    const chunkTo = new Date(chunkEnd).toISOString();

    while (true) {
      const result = await fetchFaultDataPage(api, searchFrom, chunkTo);
      if (result.length > 0) all.push(...result);
      if (result.length < FAULT_RESULTS_LIMIT) break;
      const last = result[result.length - 1];
      const lastDt = last?.dateTime;
      if (!lastDt) break;
      searchFrom = new Date(new Date(lastDt).getTime() + 1).toISOString();
    }

    start = chunkEnd;
  }

  onProgress?.(true);
  return all;
}

export async function fetchRecentFaults(
  api: GeotabApiWrapper,
  lastDays = 7
): Promise<FaultDataRecord[]> {
  const to = new Date();
  const from = new Date(to.getTime() - lastDays * 24 * 60 * 60 * 1000);
  return fetchFaultData(api, from, to);
}

export function aggregateFaults(
  faults: FaultDataRecord[],
  recentFaults: FaultDataRecord[]
): FaultAggregates {
  const recentSet = new Set(recentFaults.map((f) => f.id));
  const byDevice: FaultAggregates["byDevice"] = {};

  for (const f of faults) {
    const deviceId = f.device?.id ?? "unknown";
    const desc = f.faultDescription ?? "Unknown";
    const sev = f.severity ?? 0;
    const cnt = f.count ?? 1;

    if (!byDevice[deviceId]) {
      byDevice[deviceId] = {
        count: 0,
        recentCount: 0,
        bySeverity: {},
        topFaults: [],
      };
    }
    byDevice[deviceId].count += cnt;
    if (recentSet.has(f.id)) {
      byDevice[deviceId].recentCount += cnt;
    }
    byDevice[deviceId].bySeverity[sev] =
      (byDevice[deviceId].bySeverity[sev] ?? 0) + cnt;

    const existing = byDevice[deviceId].topFaults.find((t) => t.description === desc);
    if (existing) {
      existing.count += cnt;
    } else {
      byDevice[deviceId].topFaults.push({ description: desc, count: cnt });
    }
  }

  for (const d of Object.values(byDevice)) {
    d.topFaults.sort((a, b) => b.count - a.count);
    d.topFaults = d.topFaults.slice(0, 5);
  }

  return {
    totalFaults: faults.reduce((s, f) => s + (f.count ?? 1), 0),
    byDevice,
    recentFaults,
    rawFaults: faults,
  };
}
