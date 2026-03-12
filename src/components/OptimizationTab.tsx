import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { formatHours } from "@/lib/formatters";
import { zenith } from "@/lib/theme";
import { KpiTile } from "./KpiTile";
import { InsightsPanel } from "./InsightsPanel";
import { SectionTitle } from "./ui/SectionTitle";
import { ChartCard } from "./ui/ChartCard";
import { KpiGrid } from "./ui/KpiGrid";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import type { DataPayload } from "@/features/dataService";

export function OptimizationTab({ data }: { data: DataPayload }) {
  useDistanceUnit();
  const u = data.utilization;
  const deviceMap = new Map(data.devices.map((d) => [d.id, d.name]));

  const totalEngine = u.totalDrivingSeconds + u.totalIdlingSeconds;
  const idlePct = totalEngine > 0 ? (u.totalIdlingSeconds / totalEngine) * 100 : 0;

  const topIdle = Object.entries(u.byDevice)
    .map(([id, v]) => ({
      name: deviceMap.get(id) ?? id.slice(0, 8),
      idleHours: v.idlingSeconds / 3600,
      drivingHours: v.drivingSeconds / 3600,
    }))
    .sort((a, b) => b.idleHours - a.idleHours)
    .slice(0, 10);

  const insights = [
    { text: `Idle ratio: ${idlePct.toFixed(1)}% of engine time`, metric: "Idle %" },
    {
      text: `Speeding proxy: ${formatHours(u.speedRange1DurationSeconds + u.speedRange2DurationSeconds + u.speedRange3DurationSeconds)}`,
      metric: "Speed ranges",
    },
    {
      text: `${Object.keys(u.byDevice).length} vehicles with activity`,
      metric: "Utilization",
    },
  ];

  const actions = [
    { action: "Target idle < 15%", kpi: "Idle %", target: "< 15%", owner: "Ops", dueDate: "TBD" },
    { action: "Route optimization", kpi: "Distance", target: "-5%", owner: "Dispatch", dueDate: "TBD" },
    { action: "Driver behavior coaching", kpi: "Speeding proxy", target: "Reduce", owner: "Safety", dueDate: "TBD" },
    { action: "Shift scheduling review", kpi: "Work hours", target: "Optimize", owner: "HR", dueDate: "TBD" },
  ];

  return (
    <div>
      {u.utilizationSource === "trip" && (
        <p
          style={{
            fontSize: 13,
            color: zenith.neutral500,
            marginBottom: zenith.spacing,
            fontFamily: zenith.fontFamily,
          }}
        >
          Driving and idle times are approximate (no Data Connector).
        </p>
      )}
      <KpiGrid>
        <KpiTile title="Idle %" value={`${idlePct.toFixed(1)}%`} index={0} />
        <KpiTile title="Idle time" value={formatHours(u.totalIdlingSeconds)} index={1} />
        <KpiTile title="Speed range 1 (s)" value={u.speedRange1DurationSeconds} index={2} />
        <KpiTile title="Speed range 2+3 (s)" value={u.speedRange2DurationSeconds + u.speedRange3DurationSeconds} index={3} />
      </KpiGrid>

      <SectionTitle>Top idlers (hours)</SectionTitle>
      <ChartCard>
        <HorizontalBarChart
          data={topIdle}
          dataKey="idleHours"
          unit=" h"
          yAxisWidth={70}
          bars={[
            { dataKey: "idleHours", fill: "#ed6c02", name: "Idle (h)" },
            { dataKey: "drivingHours", fill: zenith.primary, name: "Driving (h)" },
          ]}
        />
      </ChartCard>

      <div style={{ marginTop: zenith.spacingLg }}>
        <InsightsPanel insights={insights} actions={actions} hidden />
      </div>
    </div>
  );
}
