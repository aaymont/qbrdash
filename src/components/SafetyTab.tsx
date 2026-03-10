import { useState } from "react";
import { Box, Grid, Typography, Tooltip } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { KpiTile } from "./KpiTile";
import { DrilldownTable } from "./DrilldownTable";
import { DetailDrawer } from "./DetailDrawer";
import { InsightsPanel } from "./InsightsPanel";
import type { DataPayload } from "@/features/dataService";

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  return `${(sec / 60).toFixed(0)}m`;
}

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
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={6} md={2}>
          <KpiTile title="Total events" value={s.totalEvents} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Rule types" value={Object.keys(s.byRule).length} />
        </Grid>
        <Grid item xs={6} md={2}>
          <Tooltip title={s.speedProxyLabel || ""}>
            <span>
              <KpiTile
                title="Speeding (proxy)"
                value={formatDuration(s.speedProxySeconds)}
                subtitle={s.speedProxySeconds > 0 ? "From Trip SpeedRanges" : undefined}
              />
            </span>
          </Tooltip>
        </Grid>
        {Object.entries(s.byRule).slice(0, 3).map(([ruleId, v]) => (
          <Grid item xs={6} md={2} key={ruleId}>
            <KpiTile title={v.name} value={v.count} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Events by rule type
      </Typography>
      <Box sx={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byRuleChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#d32f2f" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Recent events
      </Typography>
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

      <Box sx={{ mt: 3 }}>
        <InsightsPanel insights={insights} actions={actions} />
      </Box>

      <DetailDrawer
        open={!!drawerDevice}
        onClose={() => setDrawerDevice(null)}
        title={deviceMap.get(drawerDevice ?? "") ?? "Vehicle safety"}
      >
        {drawerDevice && (
          <Typography variant="body2" color="text.secondary">
            Events for this vehicle in selected period.
          </Typography>
        )}
      </DetailDrawer>
    </Box>
  );
}
