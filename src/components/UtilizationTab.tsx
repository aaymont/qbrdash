import { useState } from "react";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
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

const zenith = {
  primary: "var(--zenith-primary, #0078D4)",
  neutral100: "var(--zenith-neutral-100, #EDEBE9)",
  neutral500: "var(--zenith-neutral-500, #605E5C)",
  neutral700: "var(--zenith-neutral-700, #3B3A39)",
  neutral900: "var(--zenith-neutral-900, #201F1E)",
  spacing: "var(--zenith-spacing-md, 16px)",
  spacingLg: "var(--zenith-spacing-lg, 24px)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
};

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

  const rawChartData = Object.entries(u.byDevice)
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

  const chartTotal = rawChartData.reduce(
    (sum, row) => sum + (row[cfg.dataKey] as number),
    0
  );
  const chartData = rawChartData.map((row) => ({
    ...row,
    pct:
      chartTotal > 0
        ? ((row[cfg.dataKey] as number) / chartTotal) * 100
        : 0,
  }));

  const totalEngineSeconds = u.totalDrivingSeconds + u.totalIdlingSeconds;
  const pieData = [
    {
      name: "Driving",
      value: u.totalDrivingSeconds,
      color: zenith.primary,
      pct: totalEngineSeconds > 0 ? (u.totalDrivingSeconds / totalEngineSeconds) * 100 : 0,
    },
    {
      name: "Idling",
      value: u.totalIdlingSeconds,
      color: "#ed6c02",
      pct: totalEngineSeconds > 0 ? (u.totalIdlingSeconds / totalEngineSeconds) * 100 : 0,
    },
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
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: zenith.spacing,
        }}
      >
        <div style={{ flex: "1 1 0", minWidth: 140 }}>
          <KpiTile
            title="Total distance"
            value={formatDistance(u.totalDistanceKm)}
            index={0}
            selected={selectedChartMetric === "distance"}
            onClick={() => setSelectedChartMetric("distance")}
          />
        </div>
        <div style={{ flex: "1 1 0", minWidth: 140 }}>
          <KpiTile
            title="Driving time"
            value={formatHours(u.totalDrivingSeconds)}
            index={1}
            selected={selectedChartMetric === "driving"}
            onClick={() => setSelectedChartMetric("driving")}
          />
        </div>
        <div style={{ flex: "1 1 0", minWidth: 140 }}>
          <KpiTile
            title="Idle time"
            value={formatHours(u.totalIdlingSeconds)}
            index={2}
            selected={selectedChartMetric === "idle"}
            onClick={() => setSelectedChartMetric("idle")}
          />
        </div>
        <div style={{ flex: "1 1 0", minWidth: 140 }}>
          <KpiTile
            title="Active vehicles"
            value={Object.keys(u.byDevice).length}
            index={3}
            selected={selectedChartMetric === "daysUsed"}
            onClick={() => setSelectedChartMetric("daysUsed")}
          />
        </div>
      </div>

      <h3 style={{ marginTop: zenith.spacingLg, marginBottom: zenith.spacing, fontSize: 16, fontWeight: 600, fontFamily: zenith.fontFamily, color: zenith.neutral900 }}>
        {cfg.title}
      </h3>
      <div style={{ height: 340, backgroundColor: "white", borderRadius: 8, padding: zenith.spacing, border: `1px solid ${zenith.neutral100}` }}>
        <AnimatedChart>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
              <defs>
                <linearGradient id="distanceBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#d32f2f" />
                  <stop offset="100%" stopColor="#2e7d32" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={zenith.neutral100} />
              <XAxis type="number" unit={effectiveUnit} tick={{ fill: zenith.neutral700 }} />
              <YAxis type="category" dataKey="name" width={120} interval={0} tick={{ fill: zenith.neutral700 }} />
              <Tooltip
                formatter={(_, __, item) => {
                  const payload = item?.payload as (ChartRow & { pct?: number }) | undefined;
                  if (!payload) return "";
                  let val: string;
                  if (selectedChartMetric === "distance") val = formatDistance(payload.distanceKm);
                  else if (selectedChartMetric === "driving") val = formatHours(payload.drivingSeconds);
                  else if (selectedChartMetric === "idle") val = formatHours(payload.idlingSeconds);
                  else val = `${payload.daysUsed} days`;
                  const pct = payload?.pct != null ? ` (${payload.pct.toFixed(1)}%)` : "";
                  return val + pct;
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
                  const p = payload as ChartRow & { pct?: number };
                  let text: string;
                  if (selectedChartMetric === "distance") {
                    const km = p?.distanceKm ?? (unit === "mi" ? (value as number) / 0.621371 : (value as number));
                    text = formatDistance(km);
                  } else if (selectedChartMetric === "driving") {
                    text = formatHours(p?.drivingSeconds ?? (value as number) * 3600);
                  } else if (selectedChartMetric === "idle") {
                    text = formatHours(p?.idlingSeconds ?? (value as number) * 3600);
                  } else {
                    text = `${p?.daysUsed ?? value} days`;
                  }
                  const pctLabel = p?.pct != null ? ` (${p.pct.toFixed(1)}%)` : "";
                  return (
                    <text
                      x={(x ?? 0) + (width ?? 0) - 4}
                      y={(y ?? 0) + (height ?? 0) / 2}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill="white"
                      style={{ fontWeight: 500, fontSize: 12 }}
                    >
                      {text}{pctLabel}
                    </text>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </AnimatedChart>
      </div>

      <h3 style={{ marginTop: zenith.spacingLg, marginBottom: zenith.spacing, fontSize: 16, fontWeight: 600, fontFamily: zenith.fontFamily, color: zenith.neutral900 }}>
        Time distribution (driving vs idle)
      </h3>
      <div style={{ height: 240, backgroundColor: "white", borderRadius: 8, padding: zenith.spacing, border: `1px solid ${zenith.neutral100}` }}>
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
                label={({ name, value, pct }: { name: string; value: number; pct?: number }) =>
                  `${name}: ${formatHours(value)}${pct != null ? ` (${pct.toFixed(1)}%)` : ""}`
                }
              >
                {pieData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, _: string, props: { payload?: { pct?: number } }) => {
                  const pct = props?.payload?.pct;
                  return formatHours(v) + (pct != null ? ` (${pct.toFixed(1)}%)` : "");
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </AnimatedChart>
      </div>

      <h3 style={{ marginTop: zenith.spacingLg, marginBottom: zenith.spacing, fontSize: 16, fontWeight: 600, fontFamily: zenith.fontFamily, color: zenith.neutral900 }}>
        Vehicle utilization
      </h3>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: zenith.spacing, cursor: "pointer", fontFamily: zenith.fontFamily, fontSize: 14 }}>
        <input
          type="checkbox"
          checked={excludeZeroDistance}
          onChange={(e) => setExcludeZeroDistance(e.target.checked)}
        />
        Exclude zero distance
      </label>
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

      <div style={{ marginTop: zenith.spacingLg }}>
        <InsightsPanel insights={insights} actions={actions} />
      </div>

      <DetailDrawer
        open={!!drawerRow}
        onClose={() => setDrawerRow(null)}
        title={drawerRow?.name ?? "Vehicle detail"}
        width={420}
      >
        {drawerRow && (() => {
          const drawerTotal =
            drawerRow.drivingSeconds + drawerRow.idlingSeconds;
          const drawerPieData = [
            {
              name: "Driving",
              value: drawerRow.drivingSeconds,
              color: zenith.primary,
              pct:
                drawerTotal > 0
                  ? (drawerRow.drivingSeconds / drawerTotal) * 100
                  : 0,
            },
            {
              name: "Idling",
              value: drawerRow.idlingSeconds,
              color: "#ed6c02",
              pct:
                drawerTotal > 0
                  ? (drawerRow.idlingSeconds / drawerTotal) * 100
                  : 0,
            },
          ].filter((d) => d.value > 0);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: zenith.spacing }}>
              <div
                style={{
                  padding: zenith.spacing,
                  textAlign: "center",
                  backgroundColor: "rgba(0,0,0,0.04)",
                  borderRadius: 8,
                  border: `1px solid ${zenith.neutral100}`,
                }}
              >
                <div style={{ fontSize: 11, color: zenith.neutral500 }}>Distance</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{formatDistance(drawerRow.distanceKm)}</div>
              </div>
              <div style={{ display: "flex", gap: zenith.spacing }}>
                <div
                  style={{
                    flex: 1,
                    padding: zenith.spacing,
                    textAlign: "center",
                    borderLeft: `3px solid ${zenith.primary}`,
                    borderRadius: 4,
                    border: `1px solid ${zenith.neutral100}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: zenith.neutral500 }}>Driving</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{formatHours(drawerRow.drivingSeconds)}</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: zenith.spacing,
                    textAlign: "center",
                    borderLeft: "3px solid #ed6c02",
                    borderRadius: 4,
                    border: `1px solid ${zenith.neutral100}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: zenith.neutral500 }}>Idling</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{formatHours(drawerRow.idlingSeconds)}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: zenith.neutral500 }}>Time distribution</div>
              <div style={{ height: 200 }}>
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
                        label={({ name, value, pct }: { name: string; value: number; pct?: number }) =>
                          value > 0
                            ? `${name}: ${formatHours(value)}${pct != null ? ` (${pct.toFixed(1)}%)` : ""}`
                            : ""
                        }
                      >
                        {drawerPieData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, _: string, props: { payload?: { pct?: number } }) => {
                          const pct = props?.payload?.pct;
                          return formatHours(v) + (pct != null ? ` (${pct.toFixed(1)}%)` : "");
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </AnimatedChart>
              </div>
            </div>
          );
        })()}
      </DetailDrawer>
    </div>
  );
}
