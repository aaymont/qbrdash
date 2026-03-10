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

export async function fetchFaultData(
  api: GeotabApiWrapper,
  fromDate: Date,
  toDate: Date,
  onProgress?: (done: boolean) => void
): Promise<FaultDataRecord[]> {
  const fromStr = fromDate.toISOString();
  const toStr = toDate.toISOString();

  const result = (await api.call("Get", {
    typeName: "FaultData",
    search: {
      fromDate: fromStr,
      toDate: toStr,
    },
    resultsLimit: 10000,
  })) as FaultDataRecord[];

  onProgress?.(true);
  return result && Array.isArray(result) ? result : [];
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
