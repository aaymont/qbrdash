import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { Button } from "@geotab/zenith";

const zenith = {
  neutral100: "var(--zenith-neutral-100, #EDEBE9)",
  neutral500: "var(--zenith-neutral-500, #605E5C)",
  neutral900: "var(--zenith-neutral-900, #201F1E)",
  spacing: "var(--zenith-spacing-md, 16px)",
  spacingLg: "var(--zenith-spacing-lg, 24px)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
};

interface PrintViewProps {
  data: import("@/features/dataService").DataPayload;
  client: string;
  onClose: () => void;
}

export function PrintView({ data, client, onClose }: PrintViewProps) {
  const { formatDistance } = useDistanceUnit();
  const u = data.utilization;
  const s = data.safety;
  const f = data.faults;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        padding: zenith.spacingLg,
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: zenith.fontFamily,
      }}
    >
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Button type="secondary" onClick={onClose}>
          Close
        </Button>
        <Button type="primary" onClick={handlePrint}>
          Print / PDF
        </Button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px 0", color: zenith.neutral900 }}>
        Geotab QBR Summary
      </h1>
      <p style={{ fontSize: 14, color: zenith.neutral500, margin: "0 0 16px 0" }}>
        {client} — {new Date().toLocaleDateString()}
      </p>
      <hr style={{ border: "none", borderTop: `1px solid ${zenith.neutral100}` }} />

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: zenith.spacingLg, color: zenith.neutral900 }}>
        Utilization
      </h2>
      <p style={{ fontSize: 14, color: zenith.neutral900, margin: "8px 0 0 0" }}>
        Distance: {formatDistance(u.totalDistanceKm)} | Trips: {u.tripCount} | Driving: {(u.totalDrivingSeconds / 3600).toFixed(1)} h | Idle: {(u.totalIdlingSeconds / 3600).toFixed(1)} h
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: zenith.spacingLg, color: zenith.neutral900 }}>
        Safety
      </h2>
      <p style={{ fontSize: 14, color: zenith.neutral900, margin: "8px 0 0 0" }}>
        Total events: {s.totalEvents} | Rule types: {Object.keys(s.byRule).length} | Speeding proxy: {(s.speedProxySeconds / 60).toFixed(0)} min
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: zenith.spacingLg, color: zenith.neutral900 }}>
        Maintenance
      </h2>
      <p style={{ fontSize: 14, color: zenith.neutral900, margin: "8px 0 0 0" }}>
        Total faults: {f.totalFaults} | Recent (7d): {f.recentFaults.length} | Vehicles affected: {Object.keys(f.byDevice).length}
      </p>

      <p style={{ fontSize: 11, color: zenith.neutral500, marginTop: zenith.spacingLg, textTransform: "uppercase" }}>
        Data cached: {new Date(data.cachedAt).toLocaleString()} — Valid until {new Date(data.expiresAt).toLocaleString()}
      </p>
    </div>
  );
}
