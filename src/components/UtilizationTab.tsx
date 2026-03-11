import { useState } from "react";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { Box, Typography, FormControlLabel, Switch, Paper, Stack } from "@mui/material";
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

type ChartMetric = "distance" | "driving" | "idle" | "daysUsed";

interface ChartRow {
  name: string;
  deviceId: string;
  distance: number;
  distanceKm: number;
  driving: number;
  drivingSeconds: number;
  idle: number;
  idlingSeconds: number;
  daysUsed: number;
  trips: number;
}

const CHART_CONFIG: Record<
  ChartMetric,
  { title: string; dataKey: keyof ChartRow; sortKey: keyof ChartRow; unit: string }
> = {
  distance: {
    title: "Distance by vehicle (top 10)",
    dataKey: "distance",
    sortKey: "distance",
    unit: " km",
  },
  driving: {
    title: "Driving time by vehicle (top 10)",
    dataKey: "driving",
    sortKey: "driving",
    unit: " h",
  },
  idle: {
    title: "Idle time by vehicle (top 10)",
    dataKey: "idle",
    sortKey: "idle",
    unit: " h",
  },
  daysUsed: {
    title: "Days used by vehicle (top 10)",
    dataKey: "daysUsed",
    sortKey: "daysUsed",
    unit: " days",
  },
};

export function UtilizationTab({ data }: { data: DataPayload }) {
  const { formatDistance, toDisplayValue, unit } = useDistanceUnit();
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetric>("distance");
  const [excludeZeroDistance, setExcludeZeroDistance] = useState(false);
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
  const cfg = CHART_CONFIG[selectedChartMetric];
  const displayUnit = unit === "mi" ? " mi" : " km";
  const effectiveUnit = selectedChartMetric === "distance" ? displayUnit : cfg.unit;

  const chartData = Object.entries(u.byDevice)
    .map(([id, v]) => ({
      name: deviceMap.get(id) ?? id.slice(0, 8),
      deviceId: id,
      distance: toDisplayValue(v.distanceKm),
      distanceKm: v.distanceKm,
      driving: v.drivingSeconds / 3600,
      drivingSeconds: v.drivingSeconds,
      idle: v.idlingSeconds / 3600,
      idlingSeconds: v.idlingSeconds,
      daysUsed: v.daysUsed ?? 0,
      trips: v.tripCount,
    }))
    .sort((a, b) => (b[cfg.sortKey] as number) - (a[cfg.sortKey] as number))
    .slice(0, 10);

  const pieData = [
    { name: "Driving", value: u.totalDrivingSeconds, color: "#1976d2" },
    { name: "Idling", value: u.totalIdlingSeconds, color: "#ed6c02" },
  ].filter((d) => d.value > 0);

  const tableRows = Object.entries(u.byDevice).map(([deviceId, v]) => {
    const total = v.drivingSeconds + v.idlingSeconds;
    const idlePct = total > 0 ? (v.idlingSeconds / total) * 100 : 0;
    return {
      device: deviceMap.get(deviceId) ?? deviceId,
      deviceId,
      distanceKm: v.distanceKm,
      drivingHours: (v.drivingSeconds / 3600).toFixed(1),
      idlingHours: (v.idlingSeconds / 3600).toFixed(1),
      idlePct,
      tripCount: v.tripCount,
    };
  });

  const insights = [
    {
      text: `Total fleet distance: ${formatDistance(u.totalDistanceKm)} over ${u.tripCount} trips`,
      metric: `Distance (${unit})`,
    },
    {
      text: `Idle time: ${formatHours(u.totalIdlingSeconds)} (${((u.totalIdlingSeconds / (u.totalDrivingSeconds + u.totalIdlingSeconds || 1)) * 100).toFixed(0)}% of engine time)`,
      metric: "Idle %",
    },
    {
      text: `Average ${formatDistance(u.totalDistanceKm / (u.tripCount || 1))} per trip`,
      metric: "Trips",
    },
    {
      text: `${Object.keys(u.byDevice).length} vehicles active in period`,
      metric: "Utilization",
    },
  ];

  const actions = [
    { action: "Reduce idle time", kpi: "Idle %", target: "< 15%", owner: "Ops", dueDate: "TBD" },
    { action: "Optimize trip routing", kpi: "Distance/trip", target: "-5%", owner: "Dispatch", dueDate: "TBD" },
    { action: "Vehicle utilization review", kpi: "Trips/vehicle", target: "+10%", owner: "Ops", dueDate: "TBD" },
    { action: "Driver coaching", kpi: "Idle/vehicle", target: "-20%", owner: "Safety", dueDate: "TBD" },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          "& > *": { flex: "1 1 0", minWidth: 140 },
        }}
      >
        <KpiTile
          title="Total distance"
          value={formatDistance(u.totalDistanceKm)}
          index={0}
          selected={selectedChartMetric === "distance"}
          onClick={() => setSelectedChartMetric("distance")}
        />
        <KpiTile
          title="Driving time"
          value={formatHours(u.totalDrivingSeconds)}
          index={1}
          selected={selectedChartMetric === "driving"}
          onClick={() => setSelectedChartMetric("driving")}
        />
        <KpiTile
          title="Idle time"
          value={formatHours(u.totalIdlingSeconds)}
          index={2}
          selected={selectedChartMetric === "idle"}
          onClick={() => setSelectedChartMetric("idle")}
        />
        <KpiTile
          title="Active vehicles"
          value={Object.keys(u.byDevice).length}
          index={3}
          selected={selectedChartMetric === "daysUsed"}
          onClick={() => setSelectedChartMetric("daysUsed")}
        />
      </Box>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        {cfg.title}
      </Typography>
      <Box sx={{ height: 340 }}>
        <AnimatedChart>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <defs>
              <linearGradient id="distanceBarGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d32f2f" />
                <stop offset="100%" stopColor="#2e7d32" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit={effectiveUnit} />
            <YAxis type="category" dataKey="name" width={120} interval={0} />
            <Tooltip
              formatter={(_, __, item) => {
                const payload = (item as { payload?: ChartRow })?.payload;
                if (!payload) return "";
                if (selectedChartMetric === "distance") return formatDistance(payload.distanceKm);
                if (selectedChartMetric === "driving") return formatHours(payload.drivingSeconds);
                if (selectedChartMetric === "idle") return formatHours(payload.idlingSeconds);
                return `${payload.daysUsed} days`;
              }}
            />
            <Bar
              dataKey={cfg.dataKey}
              fill="url(#distanceBarGradient)"
              name={
                selectedChartMetric === "distance"
                  ? `Distance (${unit})`
                  : selectedChartMetric === "daysUsed"
                    ? "Days used"
                    : selectedChartMetric === "driving"
                      ? "Driving (h)"
                      : "Idle (h)"
              }
              label={(props) => {
                const { x, y, width, height, value = 0, payload } = props;
                let text: string;
                if (selectedChartMetric === "distance") {
                  const km = payload?.distanceKm ?? (unit === "mi" ? (value as number) / 0.621371 : (value as number));
                  text = formatDistance(km);
                } else if (selectedChartMetric === "driving") {
                  text = formatHours(payload?.drivingSeconds ?? (value as number) * 3600);
                } else if (selectedChartMetric === "idle") {
                  text = formatHours(payload?.idlingSeconds ?? (value as number) * 3600);
                } else {
                  text = `${payload?.daysUsed ?? value} days`;
                }
                return (
                  <text
                    x={(x ?? 0) + (width ?? 0) - 4}
                    y={(y ?? 0) + (height ?? 0) / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="white"
                    style={{ fontWeight: 500, fontSize: 12 }}
                  >
                    {text}
                  </text>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
        </AnimatedChart>
      </Box>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Time distribution (driving vs idle)
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
      <FormControlLabel
        control={
          <Switch
            checked={excludeZeroDistance}
            onChange={(_, checked) => setExcludeZeroDistance(checked)}
            size="small"
          />
        }
        label="Exclude zero distance"
        sx={{ mb: 1, display: "block" }}
      />
      <DrilldownTable
        rows={excludeZeroDistance ? tableRows.filter((r) => r.distanceKm > 0) : tableRows}
        columns={[
          { id: "device", label: "Vehicle" },
          {
            id: "distanceKm",
            label: `Distance (${unit})`,
            format: (r) => formatDistance(r.distanceKm as number),
          },
          {
            id: "drivingHours",
            label: "Driving (h)",
            sortValue: (r) => parseFloat((r.drivingHours as string) || "0"),
          },
          {
            id: "idlingHours",
            label: "Idling (h)",
            sortValue: (r) => parseFloat((r.idlingHours as string) || "0"),
          },
          {
            id: "idlePct",
            label: "Idle %",
            format: (r) => {
              const pct = r.idlePct as number;
              return pct > 0 ? `${pct.toFixed(1)}%` : "—";
            },
          },
        ]}
        defaultSort={{ id: "distanceKm", direction: "desc" }}
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
        width={420}
      >
        {drawerRow && (() => {
          const drawerPieData = [
            { name: "Driving", value: drawerRow.drivingSeconds, color: "#1976d2" },
            { name: "Idling", value: drawerRow.idlingSeconds, color: "#ed6c02" },
          ].filter((d) => d.value > 0);
          return (
          <Stack spacing={2.5}>
            <Paper
              variant="outlined"
              sx={{ p: 2, textAlign: "center", bgcolor: "action.hover" }}
            >
              <Typography variant="overline" color="text.secondary">
                Distance
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {formatDistance(drawerRow.distanceKm)}
              </Typography>
            </Paper>
            <Stack direction="row" spacing={2}>
              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 1.5,
                  textAlign: "center",
                  borderLeft: 3,
                  borderColor: "#1976d2",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Driving
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {formatHours(drawerRow.drivingSeconds)}
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 1.5,
                  textAlign: "center",
                  borderLeft: 3,
                  borderColor: "#ed6c02",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Idling
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {formatHours(drawerRow.idlingSeconds)}
                </Typography>
              </Paper>
            </Stack>
            <Typography variant="subtitle2" color="text.secondary">
              Time distribution
            </Typography>
            <Box sx={{ height: 200 }}>
              <AnimatedChart>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={drawerPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      label={({ name, value }) =>
                        value > 0 ? `${name}: ${formatHours(value)}` : ""
                      }
                    >
                      {drawerPieData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatHours(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </AnimatedChart>
            </Box>
          </Stack>
          );
        })()}
      </DetailDrawer>
    </Box>
  );
}
