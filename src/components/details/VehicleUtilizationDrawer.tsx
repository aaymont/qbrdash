import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { formatHours } from "@/lib/formatters";
import { zenith } from "@/lib/theme";
import { PieChartCard } from "../charts/PieChartCard";

interface VehicleUtilizationDrawerProps {
  distanceKm: number;
  drivingSeconds: number;
  idlingSeconds: number;
}

export function VehicleUtilizationDrawer({ distanceKm, drivingSeconds, idlingSeconds }: VehicleUtilizationDrawerProps) {
  const { formatDistance } = useDistanceUnit();
  const total = drivingSeconds + idlingSeconds;
  const pieData = [
    {
      name: "Driving",
      value: drivingSeconds,
      color: zenith.primary,
      pct: total > 0 ? (drivingSeconds / total) * 100 : 0,
    },
    {
      name: "Idling",
      value: idlingSeconds,
      color: "#ed6c02",
      pct: total > 0 ? (idlingSeconds / total) * 100 : 0,
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
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{formatDistance(distanceKm)}</div>
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
          <div style={{ fontSize: 14, fontWeight: 500 }}>{formatHours(drivingSeconds)}</div>
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
          <div style={{ fontSize: 14, fontWeight: 500 }}>{formatHours(idlingSeconds)}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: zenith.neutral500 }}>Time distribution</div>
      <div style={{ height: 200 }}>
        <PieChartCard
            data={pieData}
            formatValue={formatHours}
            outerRadius={70}
            innerRadius={50}
            label={({ name, value, pct }) =>
              value > 0 ? `${name}: ${formatHours(value)}${pct != null ? ` (${pct.toFixed(1)}%)` : ""}` : ""
            }
          />
      </div>
    </div>
  );
}
