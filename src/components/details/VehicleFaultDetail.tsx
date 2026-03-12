import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { zenith } from "@/lib/theme";
import { nivoTheme } from "@/lib/nivoTheme";
import type { FaultAggregates } from "@/features/maintenance/faultsPipeline";
import type { FaultDataRecord } from "@/features/maintenance/faultsPipeline";

interface VehicleFaultDetailProps {
  deviceData: FaultAggregates["byDevice"][string];
  rawFaults: FaultDataRecord[];
}

const SEVERITY_LABELS: Record<number, string> = {
  0: "Unknown",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
};

export function VehicleFaultDetail({ deviceData, rawFaults }: VehicleFaultDetailProps) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: zenith.spacing }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            padding: "4px 10px",
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${zenith.primary}`,
            color: zenith.primary,
          }}
        >
          Total: {deviceData.count}
        </span>
        <span
          style={{
            padding: "4px 10px",
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #9c27b0",
            color: "#9c27b0",
          }}
        >
          Recent (7d): {deviceData.recentCount}
        </span>
      </div>

      {deviceData.topFaults.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: zenith.neutral900 }}>Top faults</div>
          {deviceData.topFaults.map((t, i) => (
            <div key={i} style={{ fontSize: 13, padding: "2px 0", color: zenith.neutral900 }}>
              {t.description}: {t.count}
            </div>
          ))}
        </div>
      )}

      {Object.keys(deviceData.bySeverity).length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: zenith.neutral900 }}>By severity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Object.entries(deviceData.bySeverity)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([sev, cnt]) => (
                <div key={sev} style={{ fontSize: 13, color: zenith.neutral900 }}>
                  {SEVERITY_LABELS[Number(sev)] ?? `Level ${sev}`}: {cnt}
                </div>
              ))}
          </div>
        </div>
      )}

      {trendData.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: zenith.neutral900 }}>Fault trend</div>
          <div style={{ height: 120 }}>
            <ResponsiveLine
              data={[
                {
                  id: "count",
                  data: trendData.map(({ date, count }) => ({ x: date, y: count })),
                },
              ]}
              theme={nivoTheme}
              margin={{ top: 8, right: 8, bottom: 24, left: 28 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear" }}
              axisBottom={{
                tickSize: 0,
                tickPadding: 4,
                tickRotation: -45,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 4,
              }}
              enableArea
              areaOpacity={0.4}
              colors={["#9c27b0"]}
              lineWidth={2}
              pointSize={0}
              enableGridX={false}
              enableGridY
              useMesh
            />
          </div>
        </div>
      )}

      {recentFaultsList.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: zenith.neutral900 }}>Recent fault records</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${zenith.neutral100}` }}>Date</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${zenith.neutral100}` }}>Description</th>
                <th style={{ textAlign: "right", padding: 8, borderBottom: `1px solid ${zenith.neutral100}` }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {recentFaultsList.map((r, i) => (
                <tr key={r.id ?? i}>
                  <td style={{ padding: 8, borderBottom: `1px solid ${zenith.neutral100}` }}>
                    {r.dateTime ? new Date(r.dateTime).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: 8, borderBottom: `1px solid ${zenith.neutral100}` }}>
                    {r.faultDescription ?? "Unknown"}
                  </td>
                  <td style={{ padding: 8, borderBottom: `1px solid ${zenith.neutral100}`, textAlign: "right" }}>
                    {r.count ?? 1}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deviceData.topFaults.length === 0 && rawFaults.length === 0 && (
        <p style={{ fontSize: 14, color: zenith.neutral500 }}>No fault details available for this vehicle.</p>
      )}
    </div>
  );
}
