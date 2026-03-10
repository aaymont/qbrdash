import { Box, Grid, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { KpiTile } from "./KpiTile";
import { InsightsPanel } from "./InsightsPanel";
import type { DataPayload } from "@/features/dataService";

function formatHours(sec: number) {
  return `${(sec / 3600).toFixed(1)} h`;
}

export function OptimizationTab({ data }: { data: DataPayload }) {
  const u = data.utilization;
  const deviceMap = new Map(data.devices.map((d) => [d.id, d.name]));

  const totalEngine = u.totalDrivingSeconds + u.totalIdlingSeconds;
  const idlePct = totalEngine > 0 ? (u.totalIdlingSeconds / totalEngine) * 100 : 0;
  const afterHoursPct =
    u.totalDistanceKm > 0 ? (u.totalAfterHoursDistanceKm / u.totalDistanceKm) * 100 : 0;

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
    { text: `After-hours: ${afterHoursPct.toFixed(1)}% of total distance`, metric: "After-hours %" },
    {
      text: `Speeding proxy: ${formatHours(u.speedRange1DurationSeconds + u.speedRange2DurationSeconds + u.speedRange3DurationSeconds)}`,
      metric: "Speed ranges",
    },
    {
      text: `Work vs after-hours driving: ${formatHours(u.totalDrivingSeconds - u.totalAfterHoursDrivingSeconds)} vs ${formatHours(u.totalAfterHoursDrivingSeconds)}`,
      metric: "Time split",
    },
    {
      text: `${Object.keys(u.byDevice).length} vehicles with activity`,
      metric: "Utilization",
    },
  ];

  const actions = [
    { action: "Target idle < 15%", kpi: "Idle %", target: "< 15%", owner: "Ops", dueDate: "TBD" },
    { action: "Reduce after-hours usage", kpi: "After-hours", target: "-10%", owner: "FM", dueDate: "TBD" },
    { action: "Route optimization", kpi: "Distance", target: "-5%", owner: "Dispatch", dueDate: "TBD" },
    { action: "Driver behavior coaching", kpi: "Speeding proxy", target: "Reduce", owner: "Safety", dueDate: "TBD" },
    { action: "Shift scheduling review", kpi: "Work hours", target: "Optimize", owner: "HR", dueDate: "TBD" },
  ];

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={6} md={2}>
          <KpiTile title="Idle %" value={`${idlePct.toFixed(1)}%`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="After-hours %" value={`${afterHoursPct.toFixed(1)}%`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Idle time" value={formatHours(u.totalIdlingSeconds)} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="After-hours km" value={u.totalAfterHoursDistanceKm.toFixed(1)} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Speed range 1 (s)" value={u.speedRange1DurationSeconds} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Speed range 2+3 (s)" value={u.speedRange2DurationSeconds + u.speedRange3DurationSeconds} />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Top idlers (hours)
      </Typography>
      <Box sx={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topIdle} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit=" h" />
            <YAxis type="category" dataKey="name" width={70} />
            <Tooltip />
            <Bar dataKey="idleHours" fill="#ed6c02" name="Idle (h)" />
            <Bar dataKey="drivingHours" fill="#1976d2" name="Driving (h)" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ mt: 3 }}>
        <InsightsPanel insights={insights} actions={actions} />
      </Box>
    </Box>
  );
}
