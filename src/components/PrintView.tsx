import { Box, Button, Typography } from "@mui/material";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import CloseIcon from "@mui/icons-material/Close";

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
    <Box
      sx={{
        p: 3,
        maxWidth: 900,
        mx: "auto",
        "@media print": {
          "& .no-print": { display: "none" },
          p: 2,
        },
      }}
    >
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Button variant="outlined" startIcon={<CloseIcon />} onClick={onClose}>
          Close
        </Button>
        <Button variant="contained" onClick={handlePrint}>
          Print / PDF
        </Button>
      </div>

      <Typography variant="h4" gutterBottom>
        Geotab QBR Summary
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {client} — {new Date().toLocaleDateString()}
      </Typography>
      <hr />

      <Typography variant="h6" sx={{ mt: 2 }}>
        Utilization
      </Typography>
      <Typography>
        Distance: {formatDistance(u.totalDistanceKm)} | Trips: {u.tripCount} | Driving: {(u.totalDrivingSeconds / 3600).toFixed(1)} h | Idle: {(u.totalIdlingSeconds / 3600).toFixed(1)} h | After-hours: {formatDistance(u.totalAfterHoursDistanceKm)}
      </Typography>

      <Typography variant="h6" sx={{ mt: 2 }}>
        Safety
      </Typography>
      <Typography>
        Total events: {s.totalEvents} | Rule types: {Object.keys(s.byRule).length} | Speeding proxy: {(s.speedProxySeconds / 60).toFixed(0)} min
      </Typography>

      <Typography variant="h6" sx={{ mt: 2 }}>
        Maintenance
      </Typography>
      <Typography>
        Total faults: {f.totalFaults} | Recent (7d): {f.recentFaults.length} | Vehicles affected: {Object.keys(f.byDevice).length}
      </Typography>

      <Typography variant="overline" display="block" sx={{ mt: 3 }}>
        Data cached: {new Date(data.cachedAt).toLocaleString()} — Valid until {new Date(data.expiresAt).toLocaleString()}
      </Typography>
    </Box>
  );
}
