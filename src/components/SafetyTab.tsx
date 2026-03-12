import { useState } from "react";
import { formatDuration } from "@/lib/formatters";
import { zenith } from "@/lib/theme";
import { DrilldownTable } from "./DrilldownTable";
import { DetailDrawer } from "./DetailDrawer";
import { VehicleSafetyDrawer } from "./details/VehicleSafetyDrawer";
import { InsightsPanel } from "./InsightsPanel";
import { SectionTitle } from "./ui/SectionTitle";
import { ChartCard } from "./ui/ChartCard";
import { VerticalBarChart } from "./charts/VerticalBarChart";
import type { DataPayload } from "@/features/dataService";

function SafetyChartTooltip({
  entry,
}: {
  entry: { name: string; count: number; duration: number };
}) {
  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${zenith.neutral100}`,
        borderRadius: 6,
        padding: "10px 12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: zenith.neutral900 }}>{entry.name}</div>
      <div style={{ color: zenith.neutral500 }}>
        {entry.count} event{entry.count !== 1 ? "s" : ""} · {formatDuration(entry.duration)}
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Speeding: "#d32f2f",
  "Harsh braking": "#f57c00",
  "Harsh cornering": "#7b1fa2",
  "Harsh acceleration": "#1976d2",
  Other: "#616161",
};

const HARSH_CATEGORIES = [
  { key: "braking", label: "Harsh braking" },
  { key: "cornering", label: "Harsh cornering" },
  { key: "acceleration", label: "Harsh acceleration" },
] as const;

const EVENT_CATEGORIES = [
  "Speeding",
  "Harsh braking",
  "Harsh cornering",
  "Harsh acceleration",
  "Other",
] as const;

function classifyRuleToCategory(ruleName: string): (typeof EVENT_CATEGORIES)[number] {
  const n = ruleName.toLowerCase();
  if (n.includes("speeding")) return "Speeding";
  if (n.includes("braking")) return "Harsh braking";
  if (n.includes("cornering")) return "Harsh cornering";
  if (n.includes("acceleration")) return "Harsh acceleration";
  return "Other";
}

function consolidateByRule(s: DataPayload["safety"]) {
  const speedingRules = Object.entries(s.byRule).filter(([, v]) =>
    v.name.toLowerCase().includes("speeding")
  );
  const nonSpeedingRules = Object.entries(s.byRule).filter(
    ([, v]) => !v.name.toLowerCase().includes("speeding")
  );

  const speedingCount = speedingRules.reduce((acc, [, v]) => acc + v.count, 0);
  const speedingDuration = speedingRules.reduce(
    (acc, [, v]) => acc + v.totalDurationSeconds,
    0
  );

  const chartData: { name: string; count: number; duration: number }[] = [];

  if (speedingCount > 0 || s.speedProxySeconds > 0) {
    chartData.push({
      name: "Speeding",
      count: speedingCount,
      duration: speedingDuration + s.speedProxySeconds,
    });
  }

  const assignedToHarsh = new Set<string>();
  for (const { key, label } of HARSH_CATEGORIES) {
    const matching = nonSpeedingRules.filter(
      ([id, v]) =>
        v.name.toLowerCase().includes(key) && !assignedToHarsh.has(id)
    );
    for (const [id] of matching) assignedToHarsh.add(id);
    if (matching.length > 0) {
      chartData.push({
        name: label,
        count: matching.reduce((acc, [, v]) => acc + v.count, 0),
        duration: matching.reduce(
          (acc, [, v]) => acc + v.totalDurationSeconds,
          0
        ),
      });
    }
  }

  const otherRules = nonSpeedingRules.filter(([id]) => !assignedToHarsh.has(id));
  for (const [, v] of otherRules) {
    chartData.push({
      name: v.name,
      count: v.count,
      duration: v.totalDurationSeconds,
    });
  }

  const totalSpeedingDuration = speedingDuration + s.speedProxySeconds;
  const totalSpeedingCount = speedingCount;

  return { chartData, totalSpeedingDuration, totalSpeedingCount };
}

export function SafetyTab({ data }: { data: DataPayload }) {
  const [drawerDevice, setDrawerDevice] = useState<string | null>(null);

  const s = data.safety;
  const deviceMap = new Map(data.devices.map((d) => [d.id, d.name]));

  const { chartData, totalSpeedingDuration, totalSpeedingCount } =
    consolidateByRule(s);

  const parseDur = (d: unknown): number => {
    if (d == null) return 0;
    if (typeof d === "number") return d;
    if (typeof d === "object" && d !== null && "totalSeconds" in d)
      return (d as { totalSeconds?: number }).totalSeconds ?? 0;
    return 0;
  };

  type CategoryCounts = Record<(typeof EVENT_CATEGORIES)[number], { count: number; durationSeconds: number }>;
  const emptyCategoryCounts = (): CategoryCounts =>
    Object.fromEntries(EVENT_CATEGORIES.map((c) => [c, { count: 0, durationSeconds: 0 }])) as CategoryCounts;

  const byDevice = new Map<string, CategoryCounts & { speedingProxySeconds: number }>();

  for (const ex of s.rawExceptions) {
    const deviceId = ex.device?.id ?? "";
    if (!deviceId) continue;
    const ruleName = s.ruleNames[ex.rule?.id ?? ""] ?? "Unknown";
    const category = classifyRuleToCategory(ruleName);
    const dur = parseDur(ex.duration);

    let curr = byDevice.get(deviceId);
    if (!curr) {
      curr = { ...emptyCategoryCounts(), speedingProxySeconds: 0 };
      byDevice.set(deviceId, curr);
    }
    curr[category].count += 1;
    curr[category].durationSeconds += dur;
  }

  for (const [deviceId, v] of Object.entries(data.utilization?.byDevice ?? {})) {
    const proxy = v.speedProxySeconds ?? 0;
    if (proxy > 0) {
      let curr = byDevice.get(deviceId);
      if (!curr) {
        curr = { ...emptyCategoryCounts(), speedingProxySeconds: 0 };
        byDevice.set(deviceId, curr);
      }
      curr.speedingProxySeconds = proxy;
      curr.Speeding.durationSeconds += proxy;
    }
  }

  const vehicleSummaryRows = Array.from(byDevice.entries())
    .map(([deviceId, v]) => {
      const totalEvents = EVENT_CATEGORIES.reduce((s, c) => s + v[c].count, 0);
      const totalDuration = EVENT_CATEGORIES.reduce((s, c) => s + v[c].durationSeconds, 0);
      return {
        device: deviceMap.get(deviceId) ?? deviceId.slice(0, 8),
        deviceId,
        events: totalEvents,
        durationSeconds: totalDuration,
        speeding: v.Speeding.count,
        speedingDuration: v.Speeding.durationSeconds,
        harshBraking: v["Harsh braking"].count,
        harshCornering: v["Harsh cornering"].count,
        harshAcceleration: v["Harsh acceleration"].count,
        other: v.Other.count,
      };
    })
    .sort((a, b) => b.events - a.events);

  const tableRows = s.rawExceptions.slice(0, 100).map((ex) => ({
    id: ex.id,
    device: deviceMap.get(ex.device?.id ?? "") ?? ex.device?.id ?? "—",
    deviceId: ex.device?.id ?? "",
    date: ex.activeFrom?.slice(0, 16) ?? "",
    duration: formatDuration(ex.duration ?? 0),
  }));

  const insights = [
    { text: `Total safety events: ${s.totalEvents}`, metric: "Events" },
    {
      text:
        totalSpeedingCount > 0 || s.speedProxySeconds > 0
          ? `Speeding: ${formatDuration(totalSpeedingDuration)}`
          : "ExceptionEvent-based safety rules in use",
      metric: "Speeding",
    },
  ];

  const actions = [
    { action: "Coach high-event drivers", kpi: "Events", target: "-20%", owner: "Safety", dueDate: "TBD" },
    { action: "Review rule thresholds", kpi: "Events", target: "Tune", owner: "Admin", dueDate: "TBD" },
    { action: "Fleet-wide safety training", kpi: "Events", target: "-15%", owner: "Safety", dueDate: "TBD" },
    { action: "Vehicle maintenance check", kpi: "Faults", target: "Resolve", owner: "Maintenance", dueDate: "TBD" },
    { action: "Route optimization", kpi: "Speeding", target: "Reduce", owner: "Ops", dueDate: "TBD" },
  ];

  return (
    <div>
      <SectionTitle>Events by category</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: zenith.spacing }}>
        {chartData.map((c) => {
          const color = CATEGORY_COLORS[c.name] ?? CATEGORY_COLORS.Other;
          return (
            <span
              key={c.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: 999,
                backgroundColor: `${color}18`,
                color,
                fontSize: 13,
                fontWeight: 500,
                border: `1px solid ${color}40`,
              }}
            >
              {c.name}: {c.count}
            </span>
          );
        })}
      </div>
      <ChartCard height={340}>
        <VerticalBarChart
          data={chartData}
          dataKey="count"
          barName="Events"
          getBarFill={(entry) => CATEGORY_COLORS[entry.name] ?? CATEGORY_COLORS.Other}
          tooltipContent={SafetyChartTooltip}
        />
      </ChartCard>

      <SectionTitle>Safety by vehicle</SectionTitle>
      <DrilldownTable
        rows={vehicleSummaryRows}
        columns={[
          { id: "device", label: "Vehicle" },
          { id: "speeding", label: "Speeding", sortValue: (r) => r.speeding as number },
          { id: "harshBraking", label: "Harsh braking", sortValue: (r) => r.harshBraking as number },
          { id: "harshCornering", label: "Harsh cornering", sortValue: (r) => r.harshCornering as number },
          { id: "harshAcceleration", label: "Harsh acceleration", sortValue: (r) => r.harshAcceleration as number },
          { id: "other", label: "Other", sortValue: (r) => r.other as number },
          { id: "events", label: "Total", sortValue: (r) => r.events as number },
        ]}
        defaultSort={{ id: "events", direction: "desc" }}
        getRowId={(r) => r.deviceId as string}
        onRowClick={(r) => setDrawerDevice(r.deviceId as string)}
        searchFields={["device"]}
      />

      <SectionTitle>Recent events</SectionTitle>
      <DrilldownTable
        rows={tableRows}
        columns={[
          { id: "device", label: "Vehicle" },
          { id: "date", label: "Date" },
        ]}
        getRowId={(r) => r.id as string}
        onRowClick={(r) => setDrawerDevice(r.deviceId as string)}
        searchFields={["device"]}
      />

      <div style={{ marginTop: zenith.spacingLg }}>
        <InsightsPanel insights={insights} actions={actions} hidden />
      </div>

      <DetailDrawer
        open={!!drawerDevice}
        onClose={() => setDrawerDevice(null)}
        title={deviceMap.get(drawerDevice ?? "") ?? "Vehicle safety"}
        width={420}
      >
        {drawerDevice && (() => {
          const v = byDevice.get(drawerDevice);
          if (!v) {
            return (
              <p style={{ fontSize: 14, color: zenith.neutral500 }}>
                No safety data for this vehicle.
              </p>
            );
          }
          const totalEvents = EVENT_CATEGORIES.reduce((s, c) => s + v[c].count, 0);
          const recentForDevice = s.rawExceptions
            .filter((ex) => ex.device?.id === drawerDevice)
            .slice(0, 10)
            .map((ex) => ({
              date: ex.activeFrom ?? "",
              ruleName: s.ruleNames[ex.rule?.id ?? ""] ?? "Unknown",
            }));
          return (
            <VehicleSafetyDrawer
              totalEvents={totalEvents}
              speeding={v.Speeding.count}
              harshBraking={v["Harsh braking"].count}
              harshCornering={v["Harsh cornering"].count}
              harshAcceleration={v["Harsh acceleration"].count}
              other={v.Other.count}
              recentEvents={recentForDevice}
            />
          );
        })()}
      </DetailDrawer>
    </div>
  );
}
