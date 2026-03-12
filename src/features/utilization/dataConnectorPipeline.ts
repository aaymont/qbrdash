/**
 * Geotab Data Connector pipeline for utilization KPIs.
 * Fetches VehicleKpi_Daily directly with Basic Auth (no proxy). Requires credentials.
 * Falls back to Trip API if Data Connector is unavailable (CORS, 406, etc.).
 */

import type { UtilizationAggregates } from "./tripsPipeline";

/** Map MyGeotab server to Data Connector base. 1=EU, 2=US, 3=CA, 4=AU, 5=BR, 6=AS, 7=USGov. */
function getDataConnectorBase(server: string | undefined): string {
  const host = (server ?? "").toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (host.includes("my3.")) return "https://odata-connector-1.geotab.com/odata/v4/svc";
  if (host.includes("my4.")) return "https://odata-connector-4.geotab.com/odata/v4/svc";
  if (host.includes("my5.")) return "https://odata-connector-5.geotab.com/odata/v4/svc";
  if (host.includes("my6.")) return "https://odata-connector-6.geotab.com/odata/v4/svc";
  if (host.includes("my7.")) return "https://odata-connector-7.geotab.com/odata/v4/svc";
  if (host.includes("my2.")) return "https://odata-connector-2.geotab.com/odata/v4/svc";
  return "https://odata-connector-2.geotab.com/odata/v4/svc"; // my.geotab.com default = US
}

export interface DataConnectorCredentials {
  database: string;
  userName: string;
  password: string;
  server: string;
}

export interface DateWindow {
  type: "preset" | "custom";
  days?: number;
  from?: Date;
  to?: Date;
}

interface VehicleKpiRow {
  DeviceId?: string;
  Local_Date?: string;
  Distance_Km?: number;
  DriveDuration_Seconds?: number;
  IdleDuration_Seconds?: number;
  StopDuration_Seconds?: number;
  Trip_Count?: number;
  AfterHoursDistance_Km?: number;
  AfterHoursDrivingDuration_Seconds?: number;
  AfterHoursStopDuration_Seconds?: number;
}

interface ODataResponse {
  value?: VehicleKpiRow[];
  "@odata.nextLink"?: string;
}

const SEGMENT_DAYS = 7;

/** End of previous day (exclude current day data). */
function getEndOfYesterday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
}

/** Get from/to dates for the window. */
function getDateRange(window: DateWindow): { from: Date; to: Date } {
  if (window.type === "custom" && window.from && window.to) {
    return { from: window.from, to: window.to };
  }
  const days = window.days ?? 7;
  const to = getEndOfYesterday();
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - days + 1, 0, 0, 0, 0);
  return { from, to };
}

/** Split date range into 7-day segments to avoid timeouts on large pulls. */
function getSegments(from: Date, to: Date): Array<{ from: Date; to: Date }> {
  const msPerDay = 24 * 60 * 60 * 1000;
  const segments: Array<{ from: Date; to: Date }> = [];
  let start = from.getTime();
  const end = to.getTime();
  while (start < end) {
    const segmentEnd = Math.min(start + SEGMENT_DAYS * msPerDay, end);
    segments.push({
      from: new Date(start),
      to: new Date(segmentEnd),
    });
    start = segmentEnd;
  }
  return segments;
}

function toSearchParam(from: Date, to: Date): string {
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  return `from_${fromStr}_to_${toStr}`;
}

const ODATA_PROXY_PATH = "/__odata_proxy";

async function fetchODataPage(
  creds: DataConnectorCredentials,
  urlOrPath: string,
  onProgress?: (phase: string) => void
): Promise<ODataResponse> {
  onProgress?.("odata");

  // Dev: Vite proxy. Production: Firebase (or other) proxy if VITE_ODATA_PROXY_URL set; else direct fetch (CORS).
  const proxyUrl = import.meta.env.VITE_ODATA_PROXY_URL as string | undefined;
  const useProxy = import.meta.env.DEV || proxyUrl;
  const target = import.meta.env.DEV ? ODATA_PROXY_PATH : proxyUrl;
  if (useProxy && target) {
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        database: creds.database,
        userName: creds.userName,
        password: creds.password,
        server: creds.server,
        path: urlOrPath,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Data Connector: ${res.status} ${errText}`);
    }
    return res.json();
  }

  const isFullUrl = urlOrPath.startsWith("http");
  const base = getDataConnectorBase(creds.server);
  const url = isFullUrl ? urlOrPath : `${base}/${urlOrPath}`;
  const basicAuth = btoa(
    `${creds.database}/${creds.userName}:${creds.password}`
  );

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Data Connector: ${res.status} ${errText}`);
  }

  return res.json();
}

function emptyAggregates(): UtilizationAggregates {
  return {
    totalDistanceKm: 0,
    totalDrivingSeconds: 0,
    totalIdlingSeconds: 0,
    totalStopSeconds: 0,
    totalAfterHoursDistanceKm: 0,
    totalAfterHoursDrivingSeconds: 0,
    totalAfterHoursStopSeconds: 0,
    tripCount: 0,
    speedRange1Count: 0,
    speedRange1DurationSeconds: 0,
    speedRange2Count: 0,
    speedRange2DurationSeconds: 0,
    speedRange3Count: 0,
    speedRange3DurationSeconds: 0,
    byDevice: {},
    rawTrips: [],
    rawDailyRows: [],
  };
}

function mergeRowIntoAgg(agg: UtilizationAggregates, row: VehicleKpiRow): void {
  const deviceId = row.DeviceId ?? "unknown";
  const dist = row.Distance_Km ?? 0;
  const drive = row.DriveDuration_Seconds ?? 0;
  const idle = row.IdleDuration_Seconds ?? 0;
  const stop = row.StopDuration_Seconds ?? 0;
  const trips = row.Trip_Count ?? 0;
  const ahDist = row.AfterHoursDistance_Km ?? 0;
  const ahDrive = row.AfterHoursDrivingDuration_Seconds ?? 0;
  const ahStop = row.AfterHoursStopDuration_Seconds ?? 0;

  agg.totalDistanceKm += dist;
  agg.totalDrivingSeconds += drive;
  agg.totalIdlingSeconds += idle;
  agg.totalStopSeconds += stop;
  agg.tripCount += trips;
  agg.totalAfterHoursDistanceKm += ahDist;
  agg.totalAfterHoursDrivingSeconds += ahDrive;
  agg.totalAfterHoursStopSeconds += ahStop;

  if (!agg.byDevice[deviceId]) {
    agg.byDevice[deviceId] = {
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
  agg.byDevice[deviceId].distanceKm += dist;
  if (dist > 0) agg.byDevice[deviceId].daysUsed += 1;
  agg.byDevice[deviceId].drivingSeconds += drive;
  agg.byDevice[deviceId].idlingSeconds += idle;
  agg.byDevice[deviceId].stopSeconds += stop;
  agg.byDevice[deviceId].afterHoursDistanceKm += ahDist;
  agg.byDevice[deviceId].tripCount += trips;
}

/** Aggregate utilization from VehicleKpi_Daily rows. Used when slicing Data Connector cache. */
export function aggregateFromDailyRows(
  rows: Array<Record<string, unknown>>
): UtilizationAggregates {
  const agg = emptyAggregates();
  for (const row of rows) {
    mergeRowIntoAgg(agg, row as VehicleKpiRow);
  }
  return agg;
}

export async function fetchUtilizationFromDataConnector(
  creds: DataConnectorCredentials,
  window: DateWindow,
  onProgress?: (phase: string) => void
): Promise<UtilizationAggregates> {
  const { from, to } = getDateRange(window);
  const segments = getSegments(from, to);
  const select =
    "DeviceId,Local_Date,Distance_Km,DriveDuration_Seconds,IdleDuration_Seconds,StopDuration_Seconds,Trip_Count,AfterHoursDistance_Km,AfterHoursDrivingDuration_Seconds,AfterHoursStopDuration_Seconds";

  const agg = emptyAggregates();

  for (let i = 0; i < segments.length; i++) {
    onProgress?.(`odata ${i + 1}/${segments.length}`);
    const seg = segments[i];
    const search = toSearchParam(seg.from, seg.to);
    const path = `VehicleKpi_Daily?$search=${encodeURIComponent(search)}&$select=${encodeURIComponent(select)}`;
    let nextLink: string | undefined = path;

    while (nextLink) {
      const data = (await fetchODataPage(creds, nextLink, onProgress)) as ODataResponse;
      const rows = data.value ?? [];

      for (const row of rows) {
        mergeRowIntoAgg(agg, row);
        agg.rawDailyRows!.push(row as Record<string, unknown>);
      }

      nextLink = data["@odata.nextLink"] ?? undefined;
    }
  }

  return agg;
}
