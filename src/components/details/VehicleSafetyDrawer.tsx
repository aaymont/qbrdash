import { zenith } from "@/lib/theme";
import { PieChartCard } from "../charts/PieChartCard";

const CATEGORY_CONFIG = [
  { key: "Speeding", color: "#d32f2f", label: "Speeding" },
  { key: "Harsh braking", color: "#f57c00", label: "Harsh braking" },
  { key: "Harsh cornering", color: "#7b1fa2", label: "Harsh cornering" },
  { key: "Harsh acceleration", color: "#1976d2", label: "Harsh acceleration" },
  { key: "Other", color: "#616161", label: "Other" },
] as const;

export interface VehicleSafetyDrawerProps {
  totalEvents: number;
  speeding: number;
  harshBraking: number;
  harshCornering: number;
  harshAcceleration: number;
  other: number;
  recentEvents?: Array<{ date: string; ruleName: string }>;
}

export function VehicleSafetyDrawer({
  totalEvents,
  speeding,
  harshBraking,
  harshCornering,
  harshAcceleration,
  other,
  recentEvents = [],
}: VehicleSafetyDrawerProps) {
  const categoryCounts = [
    { key: "Speeding" as const, count: speeding },
    { key: "Harsh braking" as const, count: harshBraking },
    { key: "Harsh cornering" as const, count: harshCornering },
    { key: "Harsh acceleration" as const, count: harshAcceleration },
    { key: "Other" as const, count: other },
  ];

  const pieData = categoryCounts
    .filter((c) => c.count > 0)
    .map((c) => {
      const cfg = CATEGORY_CONFIG.find((x) => x.key === c.key)!;
      return {
        name: cfg.label,
        value: c.count,
        color: cfg.color,
        pct: totalEvents > 0 ? (c.count / totalEvents) * 100 : 0,
      };
    });

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
        <div style={{ fontSize: 11, color: zenith.neutral500 }}>Total events</div>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{totalEvents}</div>
      </div>

      <div style={{ fontSize: 12, color: zenith.neutral500 }}>By category</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {categoryCounts
          .filter((c) => c.count > 0)
          .map((c) => {
            const cfg = CATEGORY_CONFIG.find((x) => x.key === c.key)!;
            return (
              <span
                key={c.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 12px",
                  borderRadius: 999,
                  backgroundColor: `${cfg.color}18`,
                  color: cfg.color,
                  fontSize: 13,
                  fontWeight: 500,
                  border: `1px solid ${cfg.color}40`,
                }}
              >
                {cfg.label}: {c.count}
              </span>
            );
          })}
        {categoryCounts.every((c) => c.count === 0) && (
          <span style={{ fontSize: 13, color: zenith.neutral500 }}>No events</span>
        )}
      </div>

      {pieData.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: zenith.neutral500 }}>Event distribution</div>
          <div style={{ height: 200 }}>
            <PieChartCard
              data={pieData}
              formatValue={(v) => `${v}`}
              outerRadius={70}
              innerRadius={50}
              hideLabels
            />
          </div>
        </>
      )}

      {recentEvents.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: zenith.neutral500 }}>Recent events</div>
          <div
            style={{
              maxHeight: 160,
              overflowY: "auto",
              border: `1px solid ${zenith.neutral100}`,
              borderRadius: 8,
            }}
          >
            {recentEvents.slice(0, 10).map((ev, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderBottom:
                    i < Math.min(recentEvents.length, 10) - 1
                      ? `1px solid ${zenith.neutral100}`
                      : undefined,
                  fontSize: 13,
                }}
              >
                <span style={{ color: zenith.neutral900 }}>{ev.ruleName}</span>
                <span style={{ color: zenith.neutral500, fontSize: 12 }}>
                  {ev.date.replace("T", " ").slice(0, 16)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
