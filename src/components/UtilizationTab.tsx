import { useState } from "react";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { formatHours } from "@/lib/formatters";
import { zenith } from "@/lib/theme";
import { KpiTile } from "./KpiTile";
import { DrilldownTable } from "./DrilldownTable";
import { DetailDrawer } from "./DetailDrawer";
import { InsightsPanel } from "./InsightsPanel";
import { SectionTitle } from "./ui/SectionTitle";
import { ChartCard } from "./ui/ChartCard";
import { KpiGrid } from "./ui/KpiGrid";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import { PieChartCard } from "./charts/PieChartCard";
import { VehicleUtilizationDrawer } from "./details/VehicleUtilizationDrawer";
import type { DataPayload } from "@/features/dataService";

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

  const maxDays = data.maxDaysInWindow ?? 999;
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
      daysUsed: Math.min(v.daysUsed ?? 0, maxDays),
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

  const formatBarValue = (payload: (ChartRow & { pct?: number }) | undefined, _value: unknown) => {
    if (!payload) return "";
    if (selectedChartMetric === "distance") return formatDistance(payload.distanceKm);
    if (selectedChartMetric === "driving") return formatHours(payload.drivingSeconds);
    if (selectedChartMetric === "idle") return formatHours(payload.idlingSeconds);
    return `${payload.daysUsed} days`;
  };

  const barName =
    selectedChartMetric === "distance"
      ? `Distance (${unit})`
      : selectedChartMetric === "daysUsed"
      ? "Days used"
      : selectedChartMetric === "driving"
      ? "Driving (h)"
      : "Idle (h)";

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
      <KpiGrid variant="flex">
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
      </KpiGrid>

      <SectionTitle>{cfg.title}</SectionTitle>
      <ChartCard height={340}>
        <HorizontalBarChart<ChartRow & { pct?: number }>
          data={chartData}
          dataKey={cfg.dataKey}
          unit={effectiveUnit}
          gradientId="distanceBarGradient"
          barName={barName}
          yAxisWidth={120}
          formatValue={formatBarValue}
          showPct
        />
      </ChartCard>

      <SectionTitle>Time distribution (driving vs idle)</SectionTitle>
      <ChartCard height={480}>
        <PieChartCard
          data={pieData}
          formatValue={formatHours}
          height={400}
          margin={{ bottom: 8 }}
          arcLabelFontSize={16}
        />
      </ChartCard>

      <SectionTitle>Vehicle utilization</SectionTitle>
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
        <InsightsPanel insights={insights} actions={actions} hidden />
      </div>

      <DetailDrawer
        open={!!drawerRow}
        onClose={() => setDrawerRow(null)}
        title={drawerRow?.name ?? "Vehicle detail"}
        width={420}
      >
        {drawerRow && (
          <VehicleUtilizationDrawer
            distanceKm={drawerRow.distanceKm}
            drivingSeconds={drawerRow.drivingSeconds}
            idlingSeconds={drawerRow.idlingSeconds}
          />
        )}
      </DetailDrawer>
    </div>
  );
}
