import { useMemo, useState } from "react";
import { Box, Grid, Typography, Chip, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { KpiTile } from "./KpiTile";
import { DrilldownTable } from "./DrilldownTable";
import { DetailDrawer } from "./DetailDrawer";
import { InsightsPanel } from "./InsightsPanel";
import type { DataPayload } from "@/features/dataService";
import type { FaultAggregates } from "@/features/maintenance/faultsPipeline";
import type { FaultDataRecord } from "@/features/maintenance/faultsPipeline";

function VehicleFaultDetail({
  deviceData,
  rawFaults,
}: {
  deviceData: FaultAggregates["byDevice"][string];
  rawFaults: FaultDataRecord[];
}) {
  const trendData = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const r of rawFaults) {
      const day = r.dateTime?.slice(0, 10) ?? "";
      if (day) byDate[day] = (byDate[day] ?? 0) + (r.count ?? 1);
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [rawFaults]);

  const recentFaultsList = useMemo(
    () =>
      [...rawFaults]
        .sort((a, b) => (b.dateTime ?? "").localeCompare(a.dateTime ?? ""))
        .slice(0, 15),
    [rawFaults]
  );

  const severityLabels: Record<number, string> = {
    0: "Unknown",
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Critical",
  };

  return (
    <Box sx={{ "& > * + *": { mt: 2 } }}>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Chip label={`Total: ${deviceData.count}`} color="primary" variant="outlined" size="small" />
        <Chip label={`Recent (7d): ${deviceData.recentCount}`} color="secondary" variant="outlined" size="small" />
      </Box>

      {deviceData.topFaults.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Top faults
          </Typography>
          {deviceData.topFaults.map((t, i) => (
            <Typography key={i} variant="body2" display="block" sx={{ py: 0.25 }}>
              {t.description}: {t.count}
            </Typography>
          ))}
        </Box>
      )}

      {Object.keys(deviceData.bySeverity).length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            By severity
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {Object.entries(deviceData.bySeverity)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([sev, cnt]) => (
                <Typography key={sev} variant="body2">
                  {severityLabels[Number(sev)] ?? `Level ${sev}`}: {cnt}
                </Typography>
              ))}
          </Box>
        </Box>
      )}

      {trendData.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Fault trend
          </Typography>
          <Box sx={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis width={24} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#9c27b0" fill="#9c27b0" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}

      {recentFaultsList.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Recent fault records
          </Typography>
          <Table size="small" padding="none">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentFaultsList.map((r, i) => (
                <TableRow key={r.id ?? i}>
                  <TableCell sx={{ fontSize: "0.75rem" }}>
                    {r.dateTime ? new Date(r.dateTime).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.75rem" }}>
                    {r.faultDescription ?? "Unknown"}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
                    {r.count ?? 1}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {deviceData.topFaults.length === 0 && rawFaults.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No fault details available for this vehicle.
        </Typography>
      )}
    </Box>
  );
}

export function MaintenanceTab({ data }: { data: DataPayload }) {
  const [drawerDevice, setDrawerDevice] = useState<string | null>(null);

  const f = data.faults;
  const deviceMap = new Map(data.devices.map((d) => [d.id, d.name]));

  const chartData = Object.entries(f.byDevice)
    .map(([id, v]) => ({
      name: deviceMap.get(id) ?? id.slice(0, 8),
      total: v.count,
      recent: v.recentCount,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const tableRows = Object.entries(f.byDevice).map(([deviceId, v]) => ({
    deviceId,
    device: deviceMap.get(deviceId) ?? deviceId,
    totalFaults: v.count,
    recentFaults: v.recentCount,
    topFault: v.topFaults[0]?.description ?? "—",
  }));

  const insights = [
    { text: `Total faults in period: ${f.totalFaults}`, metric: "Faults" },
    { text: `Recent (7 days): ${f.recentFaults.length} records`, metric: "Recent" },
    { text: `${Object.keys(f.byDevice).length} vehicles with faults`, metric: "Vehicles" },
    {
      text: f.recentFaults.length > 0 ? "Recent faults tile shows last 7 days" : "No recent faults",
      metric: "Tile",
    },
    {
      text: "Severity and diagnostic info available per record",
      metric: "Details",
    },
  ];

  const actions = [
    { action: "Resolve open faults", kpi: "Fault count", target: "0 open", owner: "Maintenance", dueDate: "TBD" },
    { action: "Schedule preventive maintenance", kpi: "Recurring", target: "Reduce", owner: "Maintenance", dueDate: "TBD" },
    { action: "Dismiss cleared faults", kpi: "Clean dashboard", target: "Done", owner: "Admin", dueDate: "TBD" },
    { action: "Fleet health review", kpi: "Severity", target: "Address high", owner: "Ops", dueDate: "TBD" },
    { action: "Parts inventory check", kpi: "Top faults", target: "Stock", owner: "Parts", dueDate: "TBD" },
  ];

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={6} md={2}>
          <KpiTile title="Total faults" value={f.totalFaults} />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Recent (7d)" value={f.recentFaults.length} subtitle="Last 7 days" />
        </Grid>
        <Grid item xs={6} md={2}>
          <KpiTile title="Vehicles affected" value={Object.keys(f.byDevice).length} />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Faults by vehicle
      </Typography>
      <Box sx={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#9c27b0" name="Total (period)" />
            <Bar dataKey="recent" fill="#ed6c02" name="Recent (7d)" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Fault summary by vehicle
      </Typography>
      <DrilldownTable
        rows={tableRows}
        columns={[
          { id: "device", label: "Vehicle" },
          { id: "totalFaults", label: "Total faults" },
          { id: "recentFaults", label: "Recent (7d)" },
          { id: "topFault", label: "Top fault" },
        ]}
        getRowId={(r) => r.deviceId as string}
        onRowClick={(r) => setDrawerDevice(r.deviceId as string)}
        searchFields={["device"]}
      />

      <Box sx={{ mt: 3 }}>
        <InsightsPanel insights={insights} actions={actions} />
      </Box>

      <DetailDrawer
        open={!!drawerDevice}
        onClose={() => setDrawerDevice(null)}
        title={deviceMap.get(drawerDevice ?? "") ?? "Vehicle detail"}
      >
        {drawerDevice && f.byDevice[drawerDevice] && (
          <VehicleFaultDetail
            deviceData={f.byDevice[drawerDevice]}
            rawFaults={f.rawFaults.filter((x) => x.device?.id === drawerDevice)}
          />
        )}
      </DetailDrawer>
    </Box>
  );
}
