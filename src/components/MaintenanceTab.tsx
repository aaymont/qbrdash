import { useState } from "react";
import { zenith } from "@/lib/theme";
import { KpiTile } from "./KpiTile";
import { DrilldownTable } from "./DrilldownTable";
import { DetailDrawer } from "./DetailDrawer";
import { InsightsPanel } from "./InsightsPanel";
import { SectionTitle } from "./ui/SectionTitle";
import { ChartCard } from "./ui/ChartCard";
import { KpiGrid } from "./ui/KpiGrid";
import { VerticalBarChart } from "./charts/VerticalBarChart";
import { VehicleFaultDetail } from "./details/VehicleFaultDetail";
import type { DataPayload } from "@/features/dataService";

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
      <KpiGrid>
        <KpiTile title="Total faults" value={f.totalFaults} index={0} />
        <KpiTile title="Recent (7d)" value={f.recentFaults.length} subtitle="Last 7 days" index={1} />
        <KpiTile title="Vehicles affected" value={Object.keys(f.byDevice).length} index={2} />
      </KpiGrid>

      <SectionTitle>Faults by vehicle</SectionTitle>
      <ChartCard>
        <VerticalBarChart
          data={chartData}
          bars={[
            { dataKey: "total", fill: "#9c27b0", name: "Total (period)" },
            { dataKey: "recent", fill: "#ed6c02", name: "Recent (7d)" },
          ]}
        />
      </ChartCard>

      <SectionTitle>Fault summary by vehicle</SectionTitle>
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
        <InsightsPanel insights={insights} actions={actions} hidden />
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
