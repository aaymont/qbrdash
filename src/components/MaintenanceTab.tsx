import { useMemo, useState } from "react";
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
import { AnimatedChart } from "./Animated";
import { DrilldownTable } from "./DrilldownTable";
import { DetailDrawer } from "./DetailDrawer";
import { InsightsPanel } from "./InsightsPanel";
import type { DataPayload } from "@/features/dataService";
import type { FaultAggregates } from "@/features/maintenance/faultsPipeline";
import type { FaultDataRecord } from "@/features/maintenance/faultsPipeline";

const zenith = {
  primary: "var(--zenith-primary, #0078D4)",
  neutral100: "var(--zenith-neutral-100, #EDEBE9)",
  neutral500: "var(--zenith-neutral-500, #605E5C)",
  neutral900: "var(--zenith-neutral-900, #201F1E)",
  spacing: "var(--zenith-spacing-md, 16px)",
  spacingLg: "var(--zenith-spacing-lg, 24px)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
};

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
            border: `1px solid #9c27b0`,
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
                  {severityLabels[Number(sev)] ?? `Level ${sev}`}: {cnt}
                </div>
              ))}
          </div>
        </div>
      )}

      {trendData.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: zenith.neutral900 }}>Fault trend</div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis width={24} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#9c27b0" fill="#9c27b0" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
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
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: zenith.spacing }}>
        <KpiTile title="Total faults" value={f.totalFaults} index={0} />
        <KpiTile title="Recent (7d)" value={f.recentFaults.length} subtitle="Last 7 days" index={1} />
        <KpiTile title="Vehicles affected" value={Object.keys(f.byDevice).length} index={2} />
      </div>

      <h3 style={{ marginTop: zenith.spacingLg, marginBottom: zenith.spacing, fontSize: 16, fontWeight: 600, fontFamily: zenith.fontFamily, color: zenith.neutral900 }}>
        Faults by vehicle
      </h3>
      <div style={{ height: 280, backgroundColor: "white", borderRadius: 8, padding: zenith.spacing, border: `1px solid ${zenith.neutral100}` }}>
        <AnimatedChart>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={zenith.neutral100} />
              <XAxis dataKey="name" tick={{ fill: zenith.neutral500 }} />
              <YAxis tick={{ fill: zenith.neutral500 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#9c27b0" name="Total (period)" />
              <Bar dataKey="recent" fill="#ed6c02" name="Recent (7d)" />
            </BarChart>
          </ResponsiveContainer>
        </AnimatedChart>
      </div>

      <h3 style={{ marginTop: zenith.spacingLg, marginBottom: zenith.spacing, fontSize: 16, fontWeight: 600, fontFamily: zenith.fontFamily, color: zenith.neutral900 }}>
        Fault summary by vehicle
      </h3>
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

      <div style={{ marginTop: zenith.spacingLg }}>
        <InsightsPanel insights={insights} actions={actions} />
      </div>

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
    </div>
  );
}
