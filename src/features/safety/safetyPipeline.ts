/**
 * Safety data pipeline: Rules + ExceptionEvents, with Trip speed proxy fallback.
 */

import type { GeotabApiWrapper } from "@/lib/geotab";

export interface RuleRecord {
  id: string;
  name: string;
}

export interface ExceptionEventRecord {
  id: string;
  rule: { id: string };
  device: { id: string };
  driver?: { id: string };
  activeFrom: string;
  activeTo?: string;
  duration?: number;
  distance?: number;
  details?: { maxSpeed?: number; speedLimit?: number };
}

export interface SafetyAggregates {
  byRule: Record<
    string,
    { name: string; count: number; totalDurationSeconds: number; byDevice: Record<string, number> }
  >;
  totalEvents: number;
  ruleNames: Record<string, string>;
  rawExceptions: ExceptionEventRecord[];
  speedProxySeconds: number;
  speedProxyLabel: string;
}

const RULE_PATTERNS = ["%Speeding%", "%Harsh%", "%Harsh%Acceleration%", "%Harsh%Braking%", "%Harsh%Cornering%"];

export async function fetchRules(
  api: GeotabApiWrapper
): Promise<RuleRecord[]> {
  const allRules: RuleRecord[] = [];
  const seen = new Set<string>();

  for (const pattern of RULE_PATTERNS) {
    try {
      const result = (await api.call("Get", {
        typeName: "Rule",
        search: {
          name: pattern,
        },
        resultsLimit: 100,
      })) as RuleRecord[];

      if (result && Array.isArray(result)) {
        for (const r of result) {
          if (r.id && !seen.has(r.id)) {
            seen.add(r.id);
            allRules.push(r);
          }
        }
      }
    } catch {
      // pattern may not match any rules
    }
  }

  return allRules;
}

export async function fetchExceptionEvents(
  api: GeotabApiWrapper,
  ruleIds: string[],
  fromDate: Date,
  toDate: Date,
  onProgress?: (chunk: number, total: number) => void
): Promise<ExceptionEventRecord[]> {
  const all: ExceptionEventRecord[] = [];

  if (ruleIds.length === 0) {
    return all;
  }

  const fromStr = fromDate.toISOString();
  const toStr = toDate.toISOString();

  const batchSize = 10;
  for (let i = 0; i < ruleIds.length; i += batchSize) {
    const batch = ruleIds.slice(i, i + batchSize);
    const calls: [string, Record<string, unknown>][] = batch.map((ruleId) => [
      "Get",
      {
        typeName: "ExceptionEvent",
        search: {
          ruleSearch: { id: ruleId },
          fromDate: fromStr,
          toDate: toStr,
        },
        resultsLimit: 5000,
      },
    ]);

    const results = await api.multiCall<ExceptionEventRecord[]>(calls);
    for (const res of results) {
      if (res && Array.isArray(res)) {
        all.push(...res);
      }
    }
    onProgress?.(Math.min(i + batchSize, ruleIds.length), ruleIds.length);
  }

  return all;
}

function parseDuration(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  if (typeof d === "object" && d !== null && "totalSeconds" in d) {
    return (d as { totalSeconds?: number }).totalSeconds ?? 0;
  }
  return 0;
}

export function aggregateSafety(
  exceptions: ExceptionEventRecord[],
  rules: RuleRecord[],
  speedProxySeconds: number
): SafetyAggregates {
  const ruleNames: Record<string, string> = {};
  for (const r of rules) {
    ruleNames[r.id] = r.name;
  }

  const byRule: SafetyAggregates["byRule"] = {};

  for (const ex of exceptions) {
    const ruleId = ex.rule?.id ?? "unknown";
    const name = ruleNames[ruleId] ?? "Unknown";
    const deviceId = ex.device?.id ?? "unknown";
    const dur = parseDuration(ex.duration);

    if (!byRule[ruleId]) {
      byRule[ruleId] = { name, count: 0, totalDurationSeconds: 0, byDevice: {} };
    }
    byRule[ruleId].count += 1;
    byRule[ruleId].totalDurationSeconds += dur;
    byRule[ruleId].byDevice[deviceId] = (byRule[ruleId].byDevice[deviceId] ?? 0) + 1;
  }

  return {
    byRule,
    totalEvents: exceptions.length,
    ruleNames,
    rawExceptions: exceptions,
    speedProxySeconds,
    speedProxyLabel:
      speedProxySeconds > 0
        ? "Speeding (proxy from Trip speed ranges)"
        : "",
  };
}
