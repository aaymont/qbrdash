import { useState } from "react";
import { Box, Grid, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { KpiTile } from "./KpiTile";
import { AnimatedChart } from "./Animated";
import { DrilldownTable } from "./DrilldownTable";
import { DetailDrawer } from "./DetailDrawer";
import { InsightsPanel } from "./InsightsPanel";
import type { DataPayload } from "@/features/dataService";

function formatHours(sec: number) {
  return `${(sec / 3600).toFixed(1)} h`;
}
function formatKm(km: number) {
  return `${km.toFixed(1)} km`;
}

export function UtilizationTab({ data }: { data: DataPayload }) {
  const [drawerRow, setDrawerRow] = useState<{
    deviceId: string;
    name: string;
    distanceKm: number;
    drivingSeconds: number;
    idlingSeconds: number;
    tripCount: number;
  } | null>(null);

  const u = data.utilization;
  const deviceMap = new Map(data.devices.map((d) => [d.id, d.name]));

  const chartData = Object.entries(u.byDevice)
    .map(([id, v]) => ({
      name: deviceMap.get(id) ?? id.slice(0, 8),
      distance: v.distanceKm,
      trips: v.tripCount,
    }))
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 10);

  const pieData = [
    { name: "Driving", value: u.totalDrivingSeconds, color: "#1976d2" },
    { name: "Idling", value: u.totalIdlingSeconds, color: "#ed6c02" },
    { name: "Stopped", value: u.totalStopSeconds, color: "#9e9e9e" },
  ].filter((d) => d.value > 0);

  const tableRows = Object.entries(u.byDevice).map(([deviceId, v]) => ({
    device: deviceMap.get(deviceId) ?? deviceId,
    deviceId,
    distanceKm: v.distanceKm,
    drivingHours: (v.drivingSeconds / 3600).toFixed(1),
    idlingHours: (v.idlingSeconds / 3600).toFixed(1),
    tripCount: v.tripCount,
  }));

  const insights = [
    {
      text: `Total fleet distance: ${formatKm(u.totalDistanceKm)} over ${u.tripCount} trips`,
      metric: "Distance (km)",
    },
    {
      text: `Idle time: ${formatHours(u.totalIdlingSeconds)} (${((u.totalIdlingSeconds / (u.totalDrivingSeconds + u.totalIdlingSeconds || 1)) * 100).toFixed(0)}% of engine time)`,
      metric: "Idle %",
    },
    {
      text: `After-hours distance: ${formatKm(u.totalAfterHoursDistanceKm)}`,
      metric: "After-hours (km)",
    },
    {
      text: `Average ${(u.totalDistanceKm / (u.tripCount || 1)).toFixed(1)} km per trip`,
      metric: "Trips",
    },
    {
      text: `${Object.keys(u.byDevice).length} vehicles active in period`,
      metric: "Utilization",
    },
  ];

  const actions = [
    { action: "Reduce idle time", kpi: "Idle %", target: "< 15%", owner: "Ops", dueDate: "TBD" },
    { action: "Review after-hours usage", kpi: "After-hours", target: "Minimize", owner: "FM", dueDate: "TBD" },
    { action: "Optimize trip routing", kpi: "Distance/trip", target: "-5%", owner: "Dispatch", dueDate: "TBD" },
    { action: "Vehicle utilization review", kpi: "Trips/vehicle", target: "+10%", owner: "Ops", dueDate: "TBD" },
    { action: "Driver coaching", kpi: "Idle/vehicle", target: "-20%", owner: "Safety", dueDate: "TBD" },
  ];

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={6} md={2}>
          <KpiTile title="Total distance" value={formatKm(u.totalDistanceKm)} index={0} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Trips" value={u.tripCount} index={1} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Driving time" value={formatHours(u.totalDrivingSeconds)} index={2} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Idle time" value={formatHours(u.totalIdlingSeconds)} index={3} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="After-hours km" value={formatKm(u.totalAfterHoursDistanceKm)} index={4} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Active vehicles" value={Object.keys(u.byDevice).length} index={5} />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Distance by vehicle (top 10)
      </Typography>
      <Box sx={{ height: 280 }}>
        <AnimatedChart>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit=" km" />
            <YAxis type="category" dataKey="name" width={70} />
            <Tooltip />
            <Bar dataKey="distance" fill="#1976d2" name="Distance (km)" />
          </BarChart>
        </ResponsiveContainer>
        </AnimatedChart>
      </Box>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Time distribution (driving / idle / stopped)
      </Typography>
      <Box sx={{ height: 240 }}>
        <AnimatedChart>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) =>
                `${name}: ${formatHours(value)}`
              }
            >
              {pieData.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatHours(v)} />
          </PieChart>
        </ResponsiveContainer>
        </AnimatedChart>
      </Box>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Vehicle utilization
      </Typography>
      <DrilldownTable
        rows={tableRows}
        columns={[
          { id: "device", label: "Vehicle" },
          { id: "distanceKm", label: "Distance (km)", format: (r) => (r.distanceKm as number).toFixed(1) },
          { id: "drivingHours", label: "Driving (h)" },
          { id: "idlingHours", label: "Idling (h)" },
          { id: "tripCount", label: "Trips" },
        ]}
        getRowId={(r) => r.deviceId as string}
        onRowClick={(r) =>
          setDrawerRow({
            deviceId: r.deviceId as string,
            name: r.device as string,
            distanceKm: r.distanceKm as number,
            drivingSeconds: (r.drivingHours as string) ? parseFloat(r.drivingHours as string) * 3600 : 0,
            idlingSeconds: (r.idlingHours as string) ? parseFloat(r.idlingHours as string) * 3600 : 0,
            tripCount: r.tripCount as number,
          })
        }
        searchFields={["device"]}
      />

      <Box sx={{ mt: 3 }}>
        <InsightsPanel insights={insights} actions={actions} />
      </Box>

      <DetailDrawer
        open={!!drawerRow}
        onClose={() => setDrawerRow(null)}
        title={drawerRow?.name ?? "Vehicle detail"}
      >
        {drawerRow && (
          <>
            <Typography variant="body2" color="text.secondary">
              Distance: {formatKm(drawerRow.distanceKm)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Driving: {formatHours(drawerRow.drivingSeconds)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Idling: {formatHours(drawerRow.idlingSeconds)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Trips: {drawerRow.tripCount}
            </Typography>
          </>
        )}
      </DetailDrawer>
    </Box>
  );
}
