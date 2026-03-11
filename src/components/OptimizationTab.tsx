import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { KpiTile } from "./KpiTile";
import { AnimatedChart } from "./Animated";
import { InsightsPanel } from "./InsightsPanel";
import type { DataPayload } from "@/features/dataService";

const zenith = {
  neutral100: "var(--zenith-neutral-100, #EDEBE9)",
  neutral500: "var(--zenith-neutral-500, #605E5C)",
  neutral900: "var(--zenith-neutral-900, #201F1E)",
  spacing: "var(--zenith-spacing-md, 16px)",
  spacingLg: "var(--zenith-spacing-lg, 24px)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
  primary: "var(--zenith-primary, #0078D4)",
};

function formatHours(sec: number) {
  return `${(sec / 3600).toFixed(1)} h`;
}

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: zenith.spacing }}>
        <KpiTile title="Idle %" value={`${idlePct.toFixed(1)}%`} index={0} />
        <KpiTile title="Idle time" value={formatHours(u.totalIdlingSeconds)} index={1} />
        <KpiTile title="Speed range 1 (s)" value={u.speedRange1DurationSeconds} index={2} />
        <KpiTile title="Speed range 2+3 (s)" value={u.speedRange2DurationSeconds + u.speedRange3DurationSeconds} index={3} />
      </div>

      <h3 style={{ marginTop: zenith.spacingLg, marginBottom: zenith.spacing, fontSize: 16, fontWeight: 600, fontFamily: zenith.fontFamily, color: zenith.neutral900 }}>
        Top idlers (hours)
      </h3>
      <div style={{ height: 280, backgroundColor: "white", borderRadius: 8, padding: zenith.spacing, border: `1px solid ${zenith.neutral100}` }}>
        <AnimatedChart>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topIdle} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={zenith.neutral100} />
              <XAxis type="number" unit=" h" tick={{ fill: zenith.neutral500 }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fill: zenith.neutral500 }} />
              <Tooltip />
              <Bar dataKey="idleHours" fill="#ed6c02" name="Idle (h)" />
              <Bar dataKey="drivingHours" fill={zenith.primary} name="Driving (h)" />
            </BarChart>
          </ResponsiveContainer>
        </AnimatedChart>
      </div>

      <div style={{ marginTop: zenith.spacingLg }}>
        <InsightsPanel insights={insights} actions={actions} />
      </div>
    </div>
  );
}
