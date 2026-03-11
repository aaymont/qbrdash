import { useState } from "react";
import { formatDuration } from "@/lib/formatters";
import { zenith } from "@/lib/theme";
import { KpiTile } from "./KpiTile";
import { DrilldownTable } from "./DrilldownTable";
import { DetailDrawer } from "./DetailDrawer";
import { InsightsPanel } from "./InsightsPanel";
import { SectionTitle } from "./ui/SectionTitle";
import { ChartCard } from "./ui/ChartCard";
import { KpiGrid } from "./ui/KpiGrid";
import { VerticalBarChart } from "./charts/VerticalBarChart";
import type { DataPayload } from "@/features/dataService";

export function SafetyTab({ data }: { data: DataPayload }) {
  const [drawerDevice, setDrawerDevice] = useState<string | null>(null);

  const s = data.safety;
  const deviceMap = new Map(data.devices.map((d) => [d.id, d.name]));

  const byRuleChart = Object.entries(s.byRule).map(([, v]) => ({
    name: v.name,
    count: v.count,
    duration: v.totalDurationSeconds,
  }));

  const tableRows = s.rawExceptions.slice(0, 100).map((ex) => ({
    id: ex.id,
    rule: s.ruleNames[ex.rule?.id ?? ""] ?? "Unknown",
    device: deviceMap.get(ex.device?.id ?? "") ?? ex.device?.id ?? "—",
    deviceId: ex.device?.id ?? "",
    date: ex.activeFrom?.slice(0, 16) ?? "",
    duration: formatDuration(ex.duration ?? 0),
  }));

  const insights = [
    { text: `Total safety events: ${s.totalEvents}`, metric: "Events" },
    {
      text: s.speedProxySeconds > 0
        ? `Speeding proxy: ${formatDuration(s.speedProxySeconds)} from Trip speed ranges`
        : "ExceptionEvent-based safety rules in use",
      metric: "Source",
    },
    {
      text: `${Object.keys(s.byRule).length} rule types triggered`,
      metric: "Rules",
    },
    ...Object.entries(s.byRule).slice(0, 2).map(([, v]) => ({
      text: `${v.name}: ${v.count} events`,
      metric: v.name,
    })),
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
      <KpiGrid>
        <KpiTile title="Total events" value={s.totalEvents} index={0} />
        <KpiTile title="Rule types" value={Object.keys(s.byRule).length} index={1} />
        <div title={s.speedProxyLabel || ""}>
          <KpiTile
            title="Speeding (proxy)"
            value={formatDuration(s.speedProxySeconds)}
            subtitle={s.speedProxySeconds > 0 ? "From Trip SpeedRanges" : undefined}
            index={2}
          />
        </div>
        {Object.entries(s.byRule).slice(0, 3).map(([ruleId, v], i) => (
          <KpiTile key={ruleId} title={v.name} value={v.count} index={3 + i} />
        ))}
      </KpiGrid>

      <SectionTitle>Events by rule type</SectionTitle>
      <ChartCard>
        <VerticalBarChart
          data={byRuleChart}
          dataKey="count"
          barFill="#d32f2f"
          barName="Count"
        />
      </ChartCard>

      <SectionTitle>Recent events</SectionTitle>
      <DrilldownTable
        rows={tableRows}
        columns={[
          { id: "rule", label: "Rule" },
          { id: "device", label: "Vehicle" },
          { id: "date", label: "Date" },
          { id: "duration", label: "Duration" },
        ]}
        getRowId={(r) => r.id as string}
        onRowClick={(r) => setDrawerDevice(r.deviceId as string)}
        searchFields={["rule", "device"]}
      />

      <div style={{ marginTop: zenith.spacingLg }}>
        <InsightsPanel insights={insights} actions={actions} />
      </div>

      <DetailDrawer
        open={!!drawerDevice}
        onClose={() => setDrawerDevice(null)}
        title={deviceMap.get(drawerDevice ?? "") ?? "Vehicle safety"}
      >
        {drawerDevice && (
          <p style={{ fontSize: 14, color: zenith.neutral500 }}>
            Events for this vehicle in selected period.
          </p>
        )}
      </DetailDrawer>
    </div>
  );
}
